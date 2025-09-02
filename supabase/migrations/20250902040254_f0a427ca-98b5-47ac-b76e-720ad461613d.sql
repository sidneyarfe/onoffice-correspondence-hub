-- Atualizar a função sync_temporary_password_with_auth para usar edge function
CREATE OR REPLACE FUNCTION public.sync_temporary_password_with_auth(p_user_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  response_body text;
BEGIN
  -- Fazer chamada para a edge function que tem privilégios de service role
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sync-temporary-password',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'password', p_password
    )
  ) INTO result;
  
  -- Verificar se a chamada foi bem-sucedida
  IF (result->>'status_code')::integer = 200 THEN
    RETURN true;
  ELSE
    RAISE LOG 'Erro ao sincronizar senha via edge function: %', result;
    RETURN false;
  END IF;
  
EXCEPTION WHEN others THEN
  RAISE LOG 'Erro ao chamar edge function sync-temporary-password: %', SQLERRM;
  RETURN false;
END;
$function$;

-- Função simplificada para sincronizar senhas existentes sem usar net.http_post
CREATE OR REPLACE FUNCTION public.sync_existing_temporary_passwords_simple()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  temp_record RECORD;
  success_count integer := 0;
  total_count integer := 0;
  result json;
BEGIN
  -- Contar usuários com senhas temporárias que não foram alteradas
  SELECT COUNT(*) INTO total_count
  FROM public.profiles 
  WHERE temporary_password_hash IS NOT NULL 
  AND (password_changed = false OR password_changed IS NULL);
  
  RETURN json_build_object(
    'total_users_with_temp_passwords', total_count,
    'message', 'Use a edge function sync-temporary-password para sincronizar individualmente',
    'instructions', 'Chame POST /functions/v1/sync-temporary-password com user_id e password para cada usuário'
  );
END;
$function$;