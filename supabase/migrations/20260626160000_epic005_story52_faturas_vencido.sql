-- Epic 005 · Story 5.2 — Cobrança como verdade: faturas + "vencido" (derivado + job diário)
-- ADITIVA e idempotente. NÃO renomeia/destrói `pagamentos` (muitos consumidores: hooks, webhooks,
-- get-financial-overview). Expõe `faturas` como VIEW (camada ideal) e adiciona o necessário p/
-- derivar e persistir "vencido" no nível da FATURA. `valor` (reais) é preservado; `valor_centavos`
-- é aditivo (padronização ideal) sem sobrescrever nada.

-- 1. Colunas aditivas em pagamentos -------------------------------------------
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS valor_centavos integer,
  ADD COLUMN IF NOT EXISTS vencida_em timestamptz;  -- quando o job marcou a fatura como vencida

COMMENT ON COLUMN public.pagamentos.valor_centavos IS
  'Valor em centavos (padrão ideal). Backfill = round(valor*100). `valor` (reais) mantido p/ compat.';
COMMENT ON COLUMN public.pagamentos.vencida_em IS
  'Carimbo do job diário quando a fatura passou a vencida (em aberto + vencimento no passado).';

-- backfill idempotente de centavos a partir de valor (reais)
UPDATE public.pagamentos
  SET valor_centavos = round(valor * 100)::int
  WHERE valor_centavos IS NULL AND valor IS NOT NULL;

-- 2. Status efetivo da fatura (derivação na leitura — fonte da verdade) --------
CREATE OR REPLACE FUNCTION public.fatura_status_efetivo(p_status text, p_vencimento date, p_pago timestamptz)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_pago IS NOT NULL OR lower(coalesce(p_status,'')) IN ('pago','paid','confirmado') THEN 'paga'
    WHEN lower(coalesce(p_status,'')) IN ('cancelado','cancelada') THEN 'cancelada'
    WHEN p_vencimento IS NOT NULL AND p_vencimento < current_date THEN 'vencida'
    ELSE 'aberta'
  END;
$$;

-- 3. VIEW faturas — a camada ideal de cobrança sobre `pagamentos` --------------
CREATE OR REPLACE VIEW public.faturas AS
  SELECT
    p.id,
    p.contratacao_id   AS cliente_id,      -- transição: contratacao_id = cliente_id (rename na 5.6)
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

-- 4. Job diário: persiste "vencida" (idempotente; só faturas em aberto e vencidas) -------------
CREATE OR REPLACE FUNCTION public.marcar_faturas_vencidas()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  UPDATE public.pagamentos
    SET vencida_em = now()
    WHERE vencida_em IS NULL
      AND data_pagamento IS NULL
      AND lower(coalesce(status,'')) NOT IN ('pago','paid','confirmado','cancelado','cancelada')
      AND data_vencimento IS NOT NULL
      AND data_vencimento < current_date;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- 5. Agendamento diário via pg_cron (se a extensão existir; senão, agendar via edge fn cron) ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('marcar-faturas-vencidas')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'marcar-faturas-vencidas');
    PERFORM cron.schedule('marcar-faturas-vencidas', '0 6 * * *', 'SELECT public.marcar_faturas_vencidas();');
  ELSE
    RAISE NOTICE 'pg_cron ausente — agende public.marcar_faturas_vencidas() por uma edge function cron.';
  END IF;
END $$;

-- ROLLBACK (manual):
--   (se agendado) SELECT cron.unschedule('marcar-faturas-vencidas');
--   DROP VIEW IF EXISTS public.faturas;
--   DROP FUNCTION IF EXISTS public.marcar_faturas_vencidas();
--   DROP FUNCTION IF EXISTS public.fatura_status_efetivo(text, date, timestamptz);
--   ALTER TABLE public.pagamentos DROP COLUMN IF EXISTS vencida_em, DROP COLUMN IF EXISTS valor_centavos;
