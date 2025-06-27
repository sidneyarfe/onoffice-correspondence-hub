
-- Corrigir e melhorar o sistema de gerenciamento de documentos existente

-- 1. Atualizar a função is_admin para ser mais robusta
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
  IF user_email IN ('onoffice1893@gmail.com', 'contato@onofficebelem.com.br') THEN
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

-- 2. Garantir que o bucket 'documentos' existe e está configurado corretamente
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,
  52428800, -- 50MB
  ARRAY[
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

-- 3. Limpar políticas existentes para recriar corretamente
DROP POLICY IF EXISTS "Admin users can manage all documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.documentos_admin;
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Clients can view documents" ON public.documentos_admin;

-- 4. Criar políticas RLS robustas para a tabela documentos_admin
CREATE POLICY "Admin users can manage all documents" ON public.documentos_admin
FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated users can view available documents" ON public.documentos_admin
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 5. Limpar políticas de storage existentes
DROP POLICY IF EXISTS "Admin users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;

-- 6. Criar políticas de storage otimizadas
CREATE POLICY "Admin users can manage document files" ON storage.objects
FOR ALL WITH CHECK (
  bucket_id = 'documentos' AND public.is_admin()
);

CREATE POLICY "Admin users can view document files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documentos' AND public.is_admin()
);

CREATE POLICY "Authenticated users can view document files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documentos' AND auth.uid() IS NOT NULL
);

-- 7. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_documentos_admin_tipo ON public.documentos_admin(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_admin_created_at ON public.documentos_admin(created_at);
CREATE INDEX IF NOT EXISTS idx_documentos_admin_disponivel ON public.documentos_admin(disponivel_por_padrao);

-- 8. Adicionar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_documentos_admin_updated_at ON public.documentos_admin;
CREATE TRIGGER update_documentos_admin_updated_at
    BEFORE UPDATE ON public.documentos_admin
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
