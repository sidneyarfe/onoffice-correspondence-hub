-- Simplificar sistema de autenticação para usar apenas Supabase Auth
-- Remover funções problemáticas e usar apenas fluxo nativo

-- Remover função problemática update_admin_password
DROP FUNCTION IF EXISTS public.update_admin_password(text, text);

-- Remover função authenticate_admin que usa sistema separado
DROP FUNCTION IF EXISTS public.authenticate_admin(text, text);

-- Atualizar função is_admin para ser mais simples e baseada apenas em email/role
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

  -- Verificar por email específico (admins principais)
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

-- Garantir que todos os admins tenham profiles corretos
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'admin'
FROM auth.users 
WHERE email IN ('onoffice1893@gmail.com', 'contato@onofficebelem.com.br', 'sidneyferreira12205@gmail.com')
OR email LIKE '%@onoffice.com'
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = now();

-- Simplificar a tabela admin_users - manter apenas para histórico se necessário
-- Não removemos para não perder dados, mas não será mais usada para autenticação