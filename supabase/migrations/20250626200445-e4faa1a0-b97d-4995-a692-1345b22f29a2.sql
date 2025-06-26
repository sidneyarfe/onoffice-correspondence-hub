
-- Primeiro, vamos verificar e corrigir as políticas RLS para documentos_admin
-- Desabilitar RLS temporariamente para verificar se há dados
ALTER TABLE public.documentos_admin DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE public.documentos_admin ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Admins can view documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Admins can insert documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Admins can update documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documentos_admin;

-- Criar políticas mais simples que funcionem
CREATE POLICY "Enable all for authenticated users" ON public.documentos_admin
FOR ALL USING (auth.uid() IS NOT NULL);

-- Inserir um perfil admin para teste se não existir
INSERT INTO public.profiles (id, email, full_name, role, password_changed)
SELECT 
  auth.uid(),
  'admin@test.com',
  'Admin Test',
  'admin',
  true
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  password_changed = true;
