-- Epic 003 · Story 3.1 — cliente_planos como registro único de assinatura + repontar pagamentos
-- Migração ADITIVA e idempotente-segura (IF NOT EXISTS). Não remove nada; os campos single-plan de
-- contratacoes_clientes permanecem legíveis durante a transição (backfill = Story 3.3).
-- Decisões: #6 mesmo plano 2x = permitido (SEM índice único parcial); #8 contrato/pagamento por
-- assinatura (campos zapsign_*/infinitepay_* na linha da assinatura).

-- 1. Contrato (ZapSign) por assinatura
ALTER TABLE public.cliente_planos
  ADD COLUMN IF NOT EXISTS zapsign_document_token text,
  ADD COLUMN IF NOT EXISTS zapsign_signing_url  text,
  ADD COLUMN IF NOT EXISTS zapsign_signed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS zapsign_template_id  text;

-- 2. Cobrança (InfinitePay) por assinatura
ALTER TABLE public.cliente_planos
  ADD COLUMN IF NOT EXISTS infinitepay_order_nsu text,
  ADD COLUMN IF NOT EXISTS infinitepay_slug      text,
  ADD COLUMN IF NOT EXISTS payment_link          text,
  ADD COLUMN IF NOT EXISTS paid_at               timestamptz,
  ADD COLUMN IF NOT EXISTS metodo_pagamento      text;

-- 3. Snapshot de preço + denormalização de produto
ALTER TABLE public.cliente_planos
  ADD COLUMN IF NOT EXISTS preco_snapshot_centavos integer,
  ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.produtos(id);

-- 4. Vocabulário de status ampliado (inclui os 3 valores atuais → não quebra linhas existentes)
ALTER TABLE public.cliente_planos DROP CONSTRAINT IF EXISTS cliente_planos_status_check;
ALTER TABLE public.cliente_planos
  ADD CONSTRAINT cliente_planos_status_check
  CHECK (status IN ('aguardando_assinatura','aguardando_pagamento','ativo','vencido','suspenso','cancelado'));

-- 5. Índices de suporte (decisão #6: NENHUM índice único parcial — duplicatas do mesmo plano OK)
CREATE INDEX IF NOT EXISTS idx_cliente_planos_status              ON public.cliente_planos (status);
CREATE INDEX IF NOT EXISTS idx_cliente_planos_proximo_vencimento  ON public.cliente_planos (proximo_vencimento);
CREATE INDEX IF NOT EXISTS idx_cliente_planos_produto_id          ON public.cliente_planos (produto_id);

-- 6. Repontar pagamentos para a assinatura (mantém contratacao_id p/ compatibilidade na transição)
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS cliente_plano_id uuid REFERENCES public.cliente_planos(id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_cliente_plano_id ON public.pagamentos (cliente_plano_id);

-- 7. FK em pagamentos.contratacao_id (hoje UUID solto) — só se NÃO houver órfãos (defensivo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.pagamentos p
    LEFT JOIN public.contratacoes_clientes c ON c.id = p.contratacao_id
    WHERE c.id IS NULL
  ) THEN
    RAISE NOTICE 'pagamentos.contratacao_id possui orfaos — FK adiada para a story de limpeza (Fase 3).';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pagamentos_contratacao_id_fkey' AND table_name = 'pagamentos'
  ) THEN
    ALTER TABLE public.pagamentos
      ADD CONSTRAINT pagamentos_contratacao_id_fkey
      FOREIGN KEY (contratacao_id) REFERENCES public.contratacoes_clientes(id);
  END IF;
END $$;

-- 8. Documentação inline
COMMENT ON COLUMN public.cliente_planos.preco_snapshot_centavos IS
  'Preco contratado congelado no momento da assinatura (independe de planos.preco_em_centavos).';
COMMENT ON COLUMN public.cliente_planos.status IS
  'Ciclo de vida da assinatura. Mapa vs contratacoes_clientes.status_contratacao em docs/architecture/n8n-sistema-on-reference.md.';
COMMENT ON COLUMN public.pagamentos.cliente_plano_id IS
  'Assinatura (cliente_planos) a que o pagamento pertence — granularidade por ciclo. NULL = pagamento legado pre-Epic 003.';

-- ROLLBACK (manual):
--   ALTER TABLE public.pagamentos DROP COLUMN IF EXISTS cliente_plano_id;
--   ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_contratacao_id_fkey;
--   ALTER TABLE public.cliente_planos
--     DROP COLUMN IF EXISTS zapsign_document_token, DROP COLUMN IF EXISTS zapsign_signing_url,
--     DROP COLUMN IF EXISTS zapsign_signed_at, DROP COLUMN IF EXISTS zapsign_template_id,
--     DROP COLUMN IF EXISTS infinitepay_order_nsu, DROP COLUMN IF EXISTS infinitepay_slug,
--     DROP COLUMN IF EXISTS payment_link, DROP COLUMN IF EXISTS paid_at,
--     DROP COLUMN IF EXISTS metodo_pagamento, DROP COLUMN IF EXISTS preco_snapshot_centavos,
--     DROP COLUMN IF EXISTS produto_id;
--   (restaurar CHECK antigo: status IN ('ativo','suspenso','cancelado'))
