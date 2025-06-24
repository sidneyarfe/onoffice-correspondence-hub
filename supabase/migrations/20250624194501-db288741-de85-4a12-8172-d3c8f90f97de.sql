
-- Remover as políticas existentes que estão causando problema
DROP POLICY IF EXISTS "Admins can insert correspondences" ON public.correspondencias;
DROP POLICY IF EXISTS "Admins can view all correspondences" ON public.correspondencias;
DROP POLICY IF EXISTS "Admins can update all correspondences" ON public.correspondencias;
DROP POLICY IF EXISTS "Admins can delete all correspondences" ON public.correspondencias;
DROP POLICY IF EXISTS "Allow admins to upload files" ON storage.objects;

-- Criar políticas mais permissivas para correspondências
CREATE POLICY "Allow authenticated and unauthenticated insert correspondences" 
  ON public.correspondencias 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated and unauthenticated view correspondences" 
  ON public.correspondencias 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated and unauthenticated update correspondences" 
  ON public.correspondencias 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Allow authenticated and unauthenticated delete correspondences" 
  ON public.correspondencias 
  FOR DELETE 
  USING (true);

-- Criar política mais permissiva para upload de arquivos
CREATE POLICY "Allow upload files to correspondencias bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'correspondencias');
