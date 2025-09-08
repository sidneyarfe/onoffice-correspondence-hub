-- Atualizar funções is_admin para incluir novo email de admin
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Obter o email do usuário
  user_email := auth.email();

  -- Verificar por email específico
  IF user_email IN ('onoffice1893@gmail.com', 'contato@onofficebelem.com.br', 'sidneyferreira12205@gmail.com') THEN
    RETURN true;
  END IF;

  -- Verificar por domínio
  IF user_email LIKE '%@onoffice.com' THEN
    RETURN true;
  END IF;

  -- Verificar por role na tabela profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Atualizar função is_admin_user para incluir novo email de admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Obter o email do usuário
  user_email := auth.email();

  -- Verificar por email específico
  IF user_email IN ('onoffice1893@gmail.com', 'contato@onofficebelem.com.br', 'sidneyferreira12205@gmail.com') THEN
    RETURN true;
  END IF;

  -- Verificar por domínio
  IF user_email LIKE '%@onoffice.com' THEN
    RETURN true;
  END IF;

  -- Verificar por role na tabela profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;