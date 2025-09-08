-- Corrigir a função sync_temporary_password_with_auth com URLs e configurações corretas
CREATE OR REPLACE FUNCTION public.sync_temporary_password_with_auth(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  response_body text;
  supabase_url text := 'https://ifpqrugbpzqpapoaameo.supabase.co';
  service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcHFydWdicHpxcGFwb2FhbWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODQ2MDU0NiwiZXhwIjoyMDY0MDM2NTQ2fQ.Up_kFtPGAi-CECdlqjzV5GoCFYDZEVHU1dNJJdFpvvY';
BEGIN
  -- Fazer chamada para a edge function que tem privilégios de service role
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/sync-temporary-password',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
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
    RAISE LOG 'Erro ao sincronizar senha via edge function: status % - body %', 
      (result->>'status_code'), (result->>'body');
    RETURN false;
  END IF;
  
EXCEPTION WHEN others THEN
  RAISE LOG 'Erro ao chamar edge function sync-temporary-password: %', SQLERRM;
  RETURN false;
END;
$function$;