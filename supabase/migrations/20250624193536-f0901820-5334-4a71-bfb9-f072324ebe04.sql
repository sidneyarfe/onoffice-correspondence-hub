
-- Criar bucket de storage para correspondências
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'correspondencias',
  'correspondencias',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Criar políticas de storage para o bucket correspondencias
CREATE POLICY "Allow admins to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'correspondencias' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Allow public access to correspondence files" ON storage.objects
FOR SELECT USING (bucket_id = 'correspondencias');

CREATE POLICY "Allow admins to delete correspondence files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'correspondencias' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Adicionar políticas RLS para correspondências permitindo operações admin
CREATE POLICY "Admins can insert correspondences" 
  ON public.correspondencias 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all correspondences" 
  ON public.correspondencias 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all correspondences" 
  ON public.correspondencias 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all correspondences" 
  ON public.correspondencias 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para usuários visualizarem suas próprias correspondências
CREATE POLICY "Users can view their own correspondences" 
  ON public.correspondencias 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para usuários atualizarem suas próprias correspondências (marcar como visualizada)
CREATE POLICY "Users can update their own correspondences" 
  ON public.correspondencias 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
