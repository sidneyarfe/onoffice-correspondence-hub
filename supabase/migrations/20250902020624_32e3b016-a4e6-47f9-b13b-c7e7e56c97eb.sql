-- Allow anonymous inserts to contratacoes_clientes for form submissions
-- This is temporary to restore N8n integration functionality
CREATE POLICY "Allow anonymous form submissions" 
ON public.contratacoes_clientes 
FOR INSERT 
WITH CHECK (
  -- Only allow basic form data, no user_id yet
  user_id IS NULL AND 
  status_contratacao = 'INICIADO' AND
  -- Ensure required fields are present
  email IS NOT NULL AND
  telefone IS NOT NULL AND
  nome_responsavel IS NOT NULL AND
  plano_selecionado IS NOT NULL AND
  tipo_pessoa IS NOT NULL
);