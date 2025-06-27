
-- Corrigir as políticas RLS da tabela documents para funcionar com admin por email
DROP POLICY IF EXISTS "Admin users can manage all documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;

-- Criar políticas baseadas em email como nas correspondências
CREATE POLICY "Admin users can manage documents by email" ON public.documents
FOR ALL USING (
  auth.email() IN (
    'onoffice1893@gmail.com',
    'contato@onofficebelem.com.br'
  ) OR
  auth.email() LIKE '%@onoffice.com'
);

-- Permitir que usuários autenticados vejam documentos (para clientes)
CREATE POLICY "Authenticated users can view documents" ON public.documents
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Corrigir as políticas de storage para o bucket documentos_fiscais
DROP POLICY IF EXISTS "Admin manage documentos_fiscais" ON storage.objects;
DROP POLICY IF EXISTS "Users view documentos_fiscais" ON storage.objects;

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
