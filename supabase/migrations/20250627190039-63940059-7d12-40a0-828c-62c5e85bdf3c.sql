
-- Primeiro, vamos desabilitar RLS temporariamente e recriar as políticas de forma mais robusta
ALTER TABLE public.documentos_admin DISABLE ROW LEVEL SECURITY;

-- Limpar todas as políticas existentes
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.documentos_admin;

-- Criar função helper para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar por email específico
  IF auth.email() IN ('onoffice1893@gmail.com', 'contato@onofficebelem.com.br') THEN
    RETURN true;
  END IF;

  -- Verificar por domínio
  IF auth.email() LIKE '%@onoffice.com' THEN
    RETURN true;
  END IF;

  -- Verificar por role na tabela profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Reabilitar RLS
ALTER TABLE public.documentos_admin ENABLE ROW LEVEL SECURITY;

-- Criar nova política mais robusta
CREATE POLICY "Admin users can manage all documents" ON public.documentos_admin
FOR ALL USING (public.is_admin_user());

-- Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Recriar políticas de storage de forma mais robusta
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;

CREATE POLICY "Admin users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documentos' AND public.is_admin_user()
);

CREATE POLICY "Admin users can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documentos' AND public.is_admin_user()
);

CREATE POLICY "Everyone can view documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documentos');
