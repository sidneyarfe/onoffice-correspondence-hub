-- Fix critical security vulnerability in contratacoes_clientes table
-- Remove the overly permissive policy that allows public access

-- Drop the dangerous policy that allows public access
DROP POLICY IF EXISTS "Admins can manage all data" ON public.contratacoes_clientes;

-- Clean up duplicate/overlapping policies to ensure proper access control
DROP POLICY IF EXISTS "Admin can view all contracts" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Admins can view all contracts" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Users can view own data" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Users can view own contracts only" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Users can update own data" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Users can update own contracts" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Admin can update contracts" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Admin can delete contracts" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Admins can delete contracts" ON public.contratacoes_clientes;

-- Create secure, consolidated RLS policies for contratacoes_clientes
-- 1. Users can only view their own contracts
CREATE POLICY "Users can view own contracts" 
ON public.contratacoes_clientes 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Users can update their own contracts (for status updates, etc.)
CREATE POLICY "Users can update own contracts" 
ON public.contratacoes_clientes 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Allow form submissions during signup (user_id will be NULL initially)
CREATE POLICY "Allow signup form submissions" 
ON public.contratacoes_clientes 
FOR INSERT 
TO anon, authenticated
WITH CHECK (user_id IS NULL);

-- 4. Admins can view all contracts
CREATE POLICY "Admins can view all contracts" 
ON public.contratacoes_clientes 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. Admins can update all contracts
CREATE POLICY "Admins can update all contracts" 
ON public.contratacoes_clientes 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 6. Admins can delete contracts
CREATE POLICY "Admins can delete contracts" 
ON public.contratacoes_clientes 
FOR DELETE 
TO authenticated
USING (public.is_admin(auth.uid()));

-- 7. Only admins can link contracts to users (when user_id gets set)
CREATE POLICY "Admins can link contracts to users" 
ON public.contratacoes_clientes 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()) AND user_id IS NOT NULL)
WITH CHECK (public.is_admin(auth.uid()));

-- Ensure RLS is enabled on the table
ALTER TABLE public.contratacoes_clientes ENABLE ROW LEVEL SECURITY;

-- Add security audit function to track access to sensitive data
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to contracts table for security monitoring
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.atividades_cliente (user_id, acao, descricao)
    VALUES (
      auth.uid(), 
      'CONTRACT_ACCESS', 
      'Accessed contract data: ' || COALESCE(NEW.id::text, OLD.id::text)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add the audit trigger (optional - for monitoring)
-- CREATE TRIGGER audit_contract_access
--   AFTER SELECT ON public.contratacoes_clientes
--   FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();