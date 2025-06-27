
-- 1. Criar a nova tabela documents para substituir a atual
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS na tabela documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Limpar políticas existentes de storage para evitar conflitos
DROP POLICY IF EXISTS "Admin users can manage document files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view document files" ON storage.objects;

-- 4. Criar políticas RLS para documents (copiando a lógica das correspondências)
-- Administradores podem fazer tudo
CREATE POLICY "Admin users can manage all documents" ON public.documents
FOR ALL USING (public.is_admin());

-- Usuários autenticados podem apenas visualizar
CREATE POLICY "Authenticated users can view documents" ON public.documents
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 5. Criar o novo bucket documentos_fiscais
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
ON CONFLICT (id) DO NOTHING;

-- 6. Criar políticas de storage para o bucket documentos_fiscais
CREATE POLICY "Admin manage documentos_fiscais" ON storage.objects
FOR ALL WITH CHECK (
  bucket_id = 'documentos_fiscais' AND public.is_admin()
);

CREATE POLICY "Users view documentos_fiscais" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documentos_fiscais' AND auth.uid() IS NOT NULL
);

-- 7. Criar trigger para atualizar updated_at automaticamente na tabela documents
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_name ON public.documents(name);
