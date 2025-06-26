
-- Corrigir as políticas RLS para documentos_admin de forma mais simples
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.documentos_admin;

-- Criar política específica para admins baseada no email
CREATE POLICY "Admins can manage documents" ON public.documentos_admin
FOR ALL USING (
  auth.email() IN (
    'onoffice1893@gmail.com',
    'contato@onofficebelem.com.br'
  ) OR
  auth.email() LIKE '%@onoffice.com'
);

-- Garantir que o bucket de documentos existe e está configurado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Políticas de storage para admins
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;

CREATE POLICY "Admins can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documentos' AND
  (
    auth.email() IN (
      'onoffice1893@gmail.com',
      'contato@onofficebelem.com.br'
    ) OR
    auth.email() LIKE '%@onoffice.com'
  )
);

CREATE POLICY "Admins can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documentos' AND
  (
    auth.email() IN (
      'onoffice1893@gmail.com',
      'contato@onofficebelem.com.br'
    ) OR
    auth.email() LIKE '%@onoffice.com'
  )
);

CREATE POLICY "Public can view documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documentos');
