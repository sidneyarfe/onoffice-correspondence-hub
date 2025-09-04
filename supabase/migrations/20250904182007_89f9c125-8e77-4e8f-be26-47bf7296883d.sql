-- Função atualizada para sincronizar automaticamente com auth.users
CREATE OR REPLACE FUNCTION public.upsert_admin(p_email text, p_password text, p_full_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_id UUID;
  password_hash TEXT;
  sync_result JSON;
BEGIN
  -- Gerar hash da senha
  password_hash := hash_password(p_password);
  
  -- Inserir ou atualizar admin na tabela admin_users
  INSERT INTO public.admin_users (email, password_hash, full_name)
  VALUES (p_email, password_hash, p_full_name)
  ON CONFLICT (email) 
  DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true,
    login_attempts = 0,
    locked_until = NULL,
    updated_at = now()
  RETURNING id INTO admin_id;
  
  -- Sincronizar com auth.users via edge function
  BEGIN
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/create-admin-auth-user',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'email', p_email,
        'password', p_password,
        'full_name', p_full_name
      )
    ) INTO sync_result;
    
    -- Verificar se a sincronização foi bem-sucedida
    IF (sync_result->>'status_code')::integer != 200 THEN
      RAISE LOG 'Falha na sincronização com auth.users para admin %: %', p_email, sync_result;
      -- Não falhar a operação, apenas logar o warning
    ELSE
      RAISE LOG 'Admin % sincronizado com sucesso no auth.users', p_email;
    END IF;
    
  EXCEPTION WHEN others THEN
    RAISE LOG 'Erro ao sincronizar admin % com auth.users: %', p_email, SQLERRM;
    -- Não falhar a operação, apenas logar o erro
  END;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Admin criado/atualizado com sucesso (com sincronização automática)',
    'admin_id', admin_id,
    'sync_attempted', true
  );
END;
$function$;

-- Executar imediatamente para o admin existente
SELECT upsert_admin('onoffice1893@gmail.com', 'OnOffice2024!', 'OnOffice Admin');