-- Criar política RLS para permitir que usuários anônimos consultem status de contratos por email
-- Isso permitirá que a página AguardandoAssinatura funcione corretamente fazendo polling
CREATE POLICY "Anonymous users can check contract status by email" 
ON public.contratacoes_clientes 
FOR SELECT 
TO public 
USING (
  email IS NOT NULL AND 
  status_contratacao IN ('INICIADO', 'CONTRATO_ENVIADO', 'CONTRATO_ASSINADO', 'PAGAMENTO_PENDENTE')
);