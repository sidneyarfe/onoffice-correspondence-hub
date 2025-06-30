
-- 1. Garantir que as políticas RLS da tabela documentos_admin estão corretas
DROP POLICY IF EXISTS "Admin users can manage all documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Authenticated users can view available documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documentos_admin;

-- Criar política única e robusta para admins
CREATE POLICY "Admin users can manage all documents" ON public.documentos_admin
FOR ALL USING (
  auth.email() IN (
    'onoffice1893@gmail.com',
    'contato@onofficebelem.com.br'
  ) OR
  auth.email() LIKE '%@onoffice.com'
);

-- 2. Garantir que o bucket documentos_fiscais tem as políticas corretas
DROP POLICY IF EXISTS "Admin manage documentos_fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Users view documentos_fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage documentos_fiscais by email" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can manage document files" ON storage.objects;

-- Políticas corretas para o bucket documentos_fiscais
CREATE POLICY "Admin manage documentos_fiscais by email" ON storage.objects
FOR ALL WITH CHECK (
  bucket_id = 'documentos_fiscais' AND (
    auth.email() IN (
      'onoffice1893@gmail.com',
      'contato@onofficebelem.com.br'
    ) OR
    auth.email() LIKE '%@onoffice.com'
  )
);

CREATE POLICY "Users view documentos_fiscais" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documentos_fiscais' AND auth.uid() IS NOT NULL
);

-- 3. Remover bucket antigo 'documentos' se existir (pode causar erro se não existir, mas é seguro)
DELETE FROM storage.buckets WHERE id = 'documentos';

-- 4. Garantir que o bucket documentos_fiscais existe e está configurado corretamente
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos_fiscais',
  'documentos_fiscais',
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

-- 5. Limpar tabela documents se não estiver sendo usada em outro lugar
-- (Comentado por segurança - descomente se tiver certeza)
-- DROP TABLE IF EXISTS public.documents CASCADE;
