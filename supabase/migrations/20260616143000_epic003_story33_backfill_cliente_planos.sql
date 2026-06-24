-- Epic 003 · Story 3.3 — Backfill: 1 cliente_planos por cliente ATIVO com plano_id.
-- Idempotente (NOT EXISTS), só LÊ contratacoes_clientes (não altera), self-validating (RAISE
-- EXCEPTION reverte tudo se algum ativo ficar sem assinatura). Snapshot de preço vem de planos.
INSERT INTO public.cliente_planos
  (cliente_id, plano_id, produto_id, data_contratacao, data_inicio, proximo_vencimento,
   status, preco_snapshot_centavos, data_ultimo_pagamento, metodo_pagamento)
SELECT
  c.id,
  c.plano_id,
  p.produto_id,
  COALESCE(c.created_at::date, CURRENT_DATE),
  COALESCE(c.created_at::date, CURRENT_DATE),
  COALESCE(
    c.proximo_vencimento::date,
    public.calcular_vencimento_por_periodicidade(
      COALESCE(c.created_at::date, CURRENT_DATE), COALESCE(p.periodicidade, 'anual'))
  ),
  'ativo',
  p.preco_em_centavos,
  c.ultimo_pagamento::date,
  c.metodo_pagamento
FROM public.contratacoes_clientes c
JOIN public.planos p ON p.id = c.plano_id
WHERE c.status_contratacao = 'ATIVO'
  AND c.plano_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.cliente_planos cp
    WHERE cp.cliente_id = c.id AND cp.plano_id = c.plano_id
  );

-- Validação transacional: aborta (rollback de tudo) se algum ATIVO com plano_id ficou sem assinatura
DO $$
DECLARE v_missing int;
BEGIN
  SELECT count(*) INTO v_missing
  FROM public.contratacoes_clientes c
  WHERE c.status_contratacao = 'ATIVO' AND c.plano_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.cliente_planos cp
                    WHERE cp.cliente_id = c.id AND cp.plano_id = c.plano_id);
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Backfill 3.3 incompleto: % clientes ATIVOS ainda sem assinatura (rollback).', v_missing;
  END IF;
END $$;

-- ROLLBACK (manual, se necessário): remover as assinaturas criadas por este backfill.
--   DELETE FROM public.cliente_planos cp
--   USING public.contratacoes_clientes c
--   WHERE cp.cliente_id = c.id AND cp.plano_id = c.plano_id
--     AND c.status_contratacao = 'ATIVO'
--     AND cp.created_at >= '2026-06-16'::date;   -- janela do batch (ajustar se reexecutado)
