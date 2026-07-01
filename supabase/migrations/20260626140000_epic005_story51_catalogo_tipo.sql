-- Epic 005 · Story 5.1 — Catálogo: distinção assinatura × avulso
-- Migração ADITIVA e idempotente. Não remove nada.
-- Decisão do usuário (#4): `tipo` mora no PRODUTO (família define a natureza); o plano herda.
--   - tipo='assinatura' → recorrente, usa planos.periodicidade
--   - tipo='avulso'     → venda única (ex.: horas de sala), usa planos.unidade + quantidade no pedido

-- 1. tipo no produto (família) — default 'assinatura' não quebra os produtos existentes
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'assinatura';

ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_tipo_check;
ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_tipo_check CHECK (tipo IN ('assinatura', 'avulso'));

-- 2. unidade no plano (price book) — usada por produtos avulsos (ex.: 'hora'); NULL p/ assinaturas
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS unidade text;

-- 3. Documentação inline
COMMENT ON COLUMN public.produtos.tipo IS
  'Natureza do produto: assinatura (recorrente, usa planos.periodicidade) ou avulso (venda única, usa planos.unidade + quantidade no pedido). Default assinatura.';
COMMENT ON COLUMN public.planos.unidade IS
  'Unidade de venda do avulso (ex.: hora, diaria, unidade). NULL para assinaturas.';

-- ROLLBACK (manual):
--   ALTER TABLE public.planos DROP COLUMN IF EXISTS unidade;
--   ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_tipo_check;
--   ALTER TABLE public.produtos DROP COLUMN IF EXISTS tipo;
