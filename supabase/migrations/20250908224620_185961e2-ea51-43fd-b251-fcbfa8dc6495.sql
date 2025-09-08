-- Corrigir a função create_temporary_password_hash para não tentar sincronizar via HTTP
CREATE OR REPLACE FUNCTION public.create_temporary_password_hash(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Apenas salvar o hash no perfil para validação (sem tentar sincronizar aqui)
  UPDATE public.profiles 
  SET temporary_password_hash = public.hash_password(p_password),
      password_changed = false,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user: %', p_user_id;
  END IF;
  
  RAISE LOG 'Hash da senha temporária salvo com sucesso para usuário: %', p_user_id;
  RETURN true;
EXCEPTION WHEN others THEN
  RAISE LOG 'Erro em create_temporary_password_hash: %', SQLERRM;
  RAISE;
END;
$function$;