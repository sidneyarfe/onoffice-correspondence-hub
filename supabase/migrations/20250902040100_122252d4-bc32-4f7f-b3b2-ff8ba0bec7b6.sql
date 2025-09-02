-- Função para sincronizar senha temporária com Supabase Auth
CREATE OR REPLACE FUNCTION public.sync_temporary_password_with_auth(p_user_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_exists boolean;
BEGIN
  -- Verificar se o usuário existe na tabela auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User does not exist: %', p_user_id;
  END IF;

  -- Atualizar a senha no Supabase Auth usando a função administrativa
  -- Esta operação requer privilégios de service role
  PERFORM auth.update_user(
    user_id := p_user_id,
    attributes := jsonb_build_object('password', p_password)
  );
  
  RETURN true;
EXCEPTION WHEN others THEN
  -- Log do erro para debug
  RAISE LOG 'Erro ao sincronizar senha temporária: %', SQLERRM;
  RETURN false;
END;
$function$;

-- Modificar a função create_temporary_password_hash para sincronizar com Auth
CREATE OR REPLACE FUNCTION public.create_temporary_password_hash(p_user_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sync_success boolean;
BEGIN
  -- Primeiro, sincronizar com Supabase Auth
  SELECT public.sync_temporary_password_with_auth(p_user_id, p_password) INTO sync_success;
  
  IF NOT sync_success THEN
    RAISE EXCEPTION 'Failed to sync password with Supabase Auth';
  END IF;

  -- Depois, salvar o hash no perfil para validação
  UPDATE public.profiles 
  SET temporary_password_hash = public.hash_password(p_password),
      password_changed = false,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user: %', p_user_id;
  END IF;
  
  RETURN true;
EXCEPTION WHEN others THEN
  RAISE LOG 'Erro em create_temporary_password_hash: %', SQLERRM;
  RAISE;
END;
$function$;

-- Função para sincronizar todas as senhas temporárias existentes
CREATE OR REPLACE FUNCTION public.sync_existing_temporary_passwords()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  temp_record RECORD;
  success_count integer := 0;
  error_count integer := 0;
  total_count integer := 0;
  decoded_password text;
  salt_prefix text := 'onoffice_salt_';
  timestamp_pos integer;
BEGIN
  -- Buscar todos os usuários com senhas temporárias que não foram alteradas
  FOR temp_record IN 
    SELECT id, temporary_password_hash, email
    FROM public.profiles 
    WHERE temporary_password_hash IS NOT NULL 
    AND (password_changed = false OR password_changed IS NULL)
  LOOP
    total_count := total_count + 1;
    
    BEGIN
      -- Decodificar a senha temporária do hash
      decoded_password := convert_from(decode(temp_record.temporary_password_hash, 'base64'), 'UTF8');
      
      -- Encontrar a posição do último underscore (antes do timestamp)
      timestamp_pos := position('_' in reverse(decoded_password));
      
      -- Extrair a senha (remover salt_prefix no início e _timestamp no final)
      decoded_password := substring(
        decoded_password, 
        length(salt_prefix) + 1, 
        length(decoded_password) - length(salt_prefix) - timestamp_pos
      );
      
      -- Sincronizar com Supabase Auth
      IF public.sync_temporary_password_with_auth(temp_record.id, decoded_password) THEN
        success_count := success_count + 1;
        RAISE LOG 'Senha sincronizada com sucesso para: %', temp_record.email;
      ELSE
        error_count := error_count + 1;
        RAISE LOG 'Falha ao sincronizar senha para: %', temp_record.email;
      END IF;
      
    EXCEPTION WHEN others THEN
      error_count := error_count + 1;
      RAISE LOG 'Erro ao processar usuário %: %', temp_record.email, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'total_processed', total_count,
    'success_count', success_count,
    'error_count', error_count,
    'message', format('Processados %s usuários, %s sucessos, %s erros', total_count, success_count, error_count)
  );
END;
$function$;