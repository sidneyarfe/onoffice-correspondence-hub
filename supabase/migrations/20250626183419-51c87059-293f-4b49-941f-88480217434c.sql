
-- Criar bucket para documentos se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remover políticas existentes se houver conflito
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;

-- Recriar políticas para upload e acesso aos documentos
CREATE POLICY "Admins can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Public can view documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documentos');
