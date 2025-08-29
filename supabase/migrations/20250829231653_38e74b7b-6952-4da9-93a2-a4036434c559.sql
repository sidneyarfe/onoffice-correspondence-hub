-- Fix critical security vulnerability in documentos_admin table
-- Remove the dangerous policy that allows unrestricted public access to all business documents

-- Drop the extremely dangerous policy that allows all operations to everyone
DROP POLICY IF EXISTS "Allow all operations on documentos_admin" ON public.documentos_admin;

-- Create secure admin-only policies for documentos_admin table

-- 1. Only admins can create documents
CREATE POLICY "Admins can create documents" 
ON public.documentos_admin 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 2. Only admins can update documents
CREATE POLICY "Admins can update documents" 
ON public.documentos_admin 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3. Only admins can delete documents
CREATE POLICY "Admins can delete documents" 
ON public.documentos_admin 
FOR DELETE 
TO authenticated
USING (public.is_admin(auth.uid()));

-- 4. Only admins can view all documents (for admin panel)
CREATE POLICY "Admins can view all documents" 
ON public.documentos_admin 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

-- The existing "Clients can view available documents" policy remains for legitimate client access
-- It already has proper restrictions based on disponivel_por_padrao and documentos_disponibilidade

-- Ensure RLS is enabled
ALTER TABLE public.documentos_admin ENABLE ROW LEVEL SECURITY;