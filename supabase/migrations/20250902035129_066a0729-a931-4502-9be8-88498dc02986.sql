-- Corrigir a função verify_password para decodificar e comparar a senha temporária
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  decoded_text text;
  salt_prefix text := 'onoffice_salt_';
  extracted_password text;
  timestamp_pos integer;
BEGIN
  -- Verificar se o hash existe e tem tamanho mínimo
  IF hash IS NULL OR length(hash) < 20 THEN
    RETURN false;
  END IF;
  
  BEGIN
    -- Decodificar o hash do base64
    decoded_text := convert_from(decode(hash, 'base64'), 'UTF8');
    
    -- Verificar se começa com o salt esperado
    IF NOT decoded_text LIKE (salt_prefix || '%') THEN
      RETURN false;
    END IF;
    
    -- Encontrar a posição do último underscore (antes do timestamp)
    timestamp_pos := position('_' in reverse(decoded_text));
    
    IF timestamp_pos = 0 THEN
      RETURN false;
    END IF;
    
    -- Extrair a senha (remover salt_prefix no início e _timestamp no final)
    extracted_password := substring(
      decoded_text, 
      length(salt_prefix) + 1, 
      length(decoded_text) - length(salt_prefix) - timestamp_pos
    );
    
    -- Comparar as senhas
    RETURN extracted_password = password;
    
  EXCEPTION WHEN others THEN
    -- Se der erro na decodificação, retornar false
    RETURN false;
  END;
END;
$function$;