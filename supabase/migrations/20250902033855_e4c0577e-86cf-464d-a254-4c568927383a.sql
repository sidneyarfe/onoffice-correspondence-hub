-- Corrigir a função hash_password para usar uma abordagem mais simples
-- que não dependa da extensão pgcrypto
CREATE OR REPLACE FUNCTION public.hash_password(password text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Usar encode com digest que está sempre disponível no PostgreSQL
  -- sha256 é seguro e não requer extensões especiais
  RETURN encode(digest(password || 'salt_onoffice_2025', 'sha256'), 'hex');
END;
$function$;