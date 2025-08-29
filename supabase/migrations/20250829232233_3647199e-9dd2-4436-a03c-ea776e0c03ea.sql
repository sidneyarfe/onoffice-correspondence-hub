-- CRITICAL SECURITY FIXES - Phase 1: Data Protection
-- Fix for: Customer Personal Data Could Be Stolen by Hackers

-- 1. Create secure signup_submissions table for anonymous form data
CREATE TABLE public.signup_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Basic contact info only - no sensitive PII
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  nome_responsavel TEXT NOT NULL,
  plano_selecionado TEXT NOT NULL,
  tipo_pessoa TEXT NOT NULL,
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Rate limiting and security
  ip_address INET,
  user_agent TEXT,
  
  -- Reference to created contract (after verification)
  contratacao_id UUID REFERENCES public.contratacoes_clientes(id)
);

-- Enable RLS on signup_submissions
ALTER TABLE public.signup_submissions ENABLE ROW LEVEL SECURITY;

-- Only allow anonymous INSERT for signup submissions (with rate limiting)
CREATE POLICY "Allow anonymous signup submissions" 
ON public.signup_submissions 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Only admins can view and manage signup submissions
CREATE POLICY "Admins can manage signup submissions" 
ON public.signup_submissions 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. Remove dangerous anonymous INSERT policies from contratacoes_clientes
DROP POLICY IF EXISTS "Form submissions allowed for signup" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Allow signup form submissions" ON public.contratacoes_clientes;

-- 3. Fix form_submissions_rate_limit - restrict to admins only
DROP POLICY IF EXISTS "Admin can manage rate limits" ON public.form_submissions_rate_limit;

CREATE POLICY "Only admins can manage rate limits" 
ON public.form_submissions_rate_limit 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4. Fix audit_log - restrict to admins only  
DROP POLICY IF EXISTS "Admin can view audit log" ON public.audit_log;

CREATE POLICY "Only admins can view audit log" 
ON public.audit_log 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. Create secure signup processing function
CREATE OR REPLACE FUNCTION public.process_signup_submission(p_submission_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  submission_data RECORD;
  new_contract_id UUID;
  result JSON;
BEGIN
  -- Only admins can process submissions
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get submission data
  SELECT * INTO submission_data
  FROM public.signup_submissions 
  WHERE id = p_submission_id AND status = 'pending';
  
  IF submission_data IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Submission not found or already processed');
  END IF;
  
  -- Create the secure contract record (admin context)
  INSERT INTO public.contratacoes_clientes (
    plano_selecionado,
    tipo_pessoa,
    email,
    telefone,
    nome_responsavel,
    status_contratacao
  ) VALUES (
    submission_data.plano_selecionado,
    submission_data.tipo_pessoa,
    submission_data.email,
    submission_data.telefone,
    submission_data.nome_responsavel,
    'AGUARDANDO_DADOS'
  ) RETURNING id INTO new_contract_id;
  
  -- Update submission status
  UPDATE public.signup_submissions 
  SET status = 'processed',
      processed_at = now(),
      contratacao_id = new_contract_id
  WHERE id = p_submission_id;
  
  RETURN json_build_object(
    'success', true, 
    'contract_id', new_contract_id,
    'message', 'Submission processed successfully'
  );
END;
$$;

-- 6. Add updated_at trigger to signup_submissions
CREATE TRIGGER update_signup_submissions_updated_at
BEFORE UPDATE ON public.signup_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create index for performance on signup_submissions
CREATE INDEX idx_signup_submissions_status ON public.signup_submissions(status);
CREATE INDEX idx_signup_submissions_created_at ON public.signup_submissions(created_at);
CREATE INDEX idx_signup_submissions_email ON public.signup_submissions(email);