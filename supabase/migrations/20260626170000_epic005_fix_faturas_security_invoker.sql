-- Epic 005 · Hotfix da Story 5.2 — a view `faturas` deve respeitar a RLS de `pagamentos`.
-- Sem `security_invoker`, uma view roda com privilégios do OWNER e IGNORA a RLS da tabela base
-- (`pagamentos` tem RLS "Users can view their own pagamentos"), expondo todos os pagamentos via
-- a anon key. Recriamos com security_invoker = true para a view herdar a RLS do solicitante.

CREATE OR REPLACE VIEW public.faturas WITH (security_invoker = true) AS
  SELECT
    p.id,
    p.contratacao_id   AS cliente_id,
    p.cliente_plano_id AS assinatura_id,
    p.user_id,
    COALESCE(p.valor_centavos, round(p.valor * 100)::int) AS valor_centavos,
    p.valor            AS valor_reais,
    p.descricao,
    p.data_vencimento  AS vencimento,
    p.data_pagamento   AS paga_em,
    p.status           AS status_origem,
    public.fatura_status_efetivo(p.status, p.data_vencimento, p.data_pagamento) AS status,
    p.vencida_em,
    p.created_at
  FROM public.pagamentos p;

COMMENT ON VIEW public.faturas IS
  'Camada ideal de cobrança sobre pagamentos. security_invoker=true → respeita a RLS de pagamentos.';

-- ROLLBACK: recriar a view sem WITH (security_invoker=true) — NÃO recomendado (reabre o vazamento).
