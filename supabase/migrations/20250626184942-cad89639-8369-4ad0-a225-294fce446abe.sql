
-- Corrigir as políticas de storage para o bucket 'documentos'
-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;

-- Recriar políticas mais específicas e corretas
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
) WITH CHECK (
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

-- Corrigir RLS na tabela documentos_admin
-- Remover política existente se houver
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Admins can view documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Admins can insert documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Admins can update documents" ON public.documentos_admin;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documentos_admin;

-- Habilitar RLS se não estiver habilitado
ALTER TABLE public.documentos_admin ENABLE ROW LEVEL SECURITY;

-- Criar políticas específicas para documentos_admin
CREATE POLICY "Admins can view documents" ON public.documentos_admin
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert documents" ON public.documentos_admin
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update documents" ON public.documentos_admin
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete documents" ON public.documentos_admin
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Criar política para clientes visualizarem documentos disponíveis
CREATE POLICY "Clients can view available documents" ON public.documentos_admin
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'user'
  ) AND
  (
    disponivel_por_padrao = true OR
    EXISTS (
      SELECT 1 FROM public.documentos_disponibilidade 
      WHERE documento_tipo = documentos_admin.tipo 
      AND user_id = auth.uid() 
      AND disponivel = true
    )
  )
);
