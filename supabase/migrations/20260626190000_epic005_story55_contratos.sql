-- Epic 005 · Story 5.5 — Contrato como entidade própria
-- Extrai o contrato (ZapSign) para `contratos`, em vez de colunas espalhadas. Aditiva: os campos
-- zapsign_* em contratacoes_clientes/assinaturas continuam existindo durante a transição.

CREATE TABLE IF NOT EXISTS public.contratos (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id             uuid NOT NULL REFERENCES public.contratacoes_clientes(id) ON DELETE CASCADE,
  assinatura_id          uuid REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  plano_id               uuid REFERENCES public.planos(id),
  zapsign_template_id    text,
  zapsign_document_token text,
  zapsign_signing_url    text,
  status                 text NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado','assinado','cancelado')),
  pdf_url                text,
  enviado_em             timestamptz NOT NULL DEFAULT now(),
  assinado_em            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id   ON public.contratos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_assinatura   ON public.contratos (assinatura_id);
CREATE INDEX IF NOT EXISTS idx_contratos_zs_token     ON public.contratos (zapsign_document_token);

COMMENT ON TABLE public.contratos IS
  'Contrato (ZapSign) como entidade. Um cliente/assinatura pode ter N contratos (reenvios/versões).';

-- RLS: admin gerencia tudo; cliente vê os seus (via contratacoes_clientes.user_id)
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gerenciam contratos" ON public.contratos;
CREATE POLICY "Admins gerenciam contratos" ON public.contratos FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clientes veem seus contratos" ON public.contratos;
CREATE POLICY "Clientes veem seus contratos" ON public.contratos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.contratacoes_clientes c WHERE c.id = contratos.cliente_id AND c.user_id = auth.uid())
);

-- ROLLBACK: DROP TABLE IF EXISTS public.contratos;
