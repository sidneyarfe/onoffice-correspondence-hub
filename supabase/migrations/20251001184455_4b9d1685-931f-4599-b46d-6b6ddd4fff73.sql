-- Migration: Unificar sistema de autenticação admin (Versão Segura)
-- Esta migration sincroniza apenas admins que já existem em auth.users

-- 1. Criar índice para melhorar performance de queries por role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Atualizar profiles existentes que correspondem a admin_users para garantir role='admin'
-- Apenas para usuários que já existem em auth.users
UPDATE public.profiles p
SET 
  role = 'admin',
  updated_at = now()
FROM public.admin_users au
WHERE p.id = au.id 
  AND p.role != 'admin'
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = au.id);

-- 3. Adicionar comentários para documentação
COMMENT ON COLUMN public.profiles.role IS 'User role: admin or user. Admin users have full system access.';

-- 4. Política RLS: Admins podem ver todos os profiles
DROP POLICY IF EXISTS "Admins can view all admin profiles" ON public.profiles;
CREATE POLICY "Admins can view all admin profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  is_admin(auth.uid()) OR auth.uid() = id
);

-- 5. Política RLS: Admins podem atualizar outros profiles (para gerenciamento de equipe)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) OR auth.uid() = id
)
WITH CHECK (
  is_admin(auth.uid()) OR auth.uid() = id
);

-- 6. Política RLS: Admins podem inserir novos profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));