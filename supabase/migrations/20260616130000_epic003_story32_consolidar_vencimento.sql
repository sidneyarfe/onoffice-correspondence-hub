-- Epic 003 · Story 3.2 — Consolidar cálculo de vencimento (fonte única no DB)
-- Trigger de rede de segurança em cliente_planos + depreciação do RPC legado. Aditivo, reversível.

-- 1. Trigger BEFORE INSERT: preenche proximo_vencimento quando vier NULL, usando a RPC canônica
--    calcular_vencimento_por_periodicidade + a periodicidade do plano. Respeita override explícito
--    (se proximo_vencimento já vier preenchido pelo chamador, não recalcula).
CREATE OR REPLACE FUNCTION public.cliente_planos_set_vencimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodicidade text;
BEGIN
  IF NEW.proximo_vencimento IS NULL THEN
    SELECT periodicidade INTO v_periodicidade FROM public.planos WHERE id = NEW.plano_id;
    NEW.proximo_vencimento := public.calcular_vencimento_por_periodicidade(
      COALESCE(NEW.data_inicio, CURRENT_DATE),
      COALESCE(v_periodicidade, 'anual')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_planos_set_vencimento ON public.cliente_planos;
CREATE TRIGGER trg_cliente_planos_set_vencimento
BEFORE INSERT ON public.cliente_planos
FOR EACH ROW
EXECUTE FUNCTION public.cliente_planos_set_vencimento();

-- 2. Depreciar o RPC legado baseado em strings ('1 ANO'/'1 MES'). Mantido por compatibilidade;
--    a autoridade passa a ser calcular_vencimento_por_periodicidade (membership-aware).
COMMENT ON FUNCTION public.calcular_proximo_vencimento(date, text) IS
  'DEPRECATED (Epic 003 Story 3.2): use calcular_vencimento_por_periodicidade(data_inicio, periodicidade). Remocao planejada na limpeza da Fase 3.';

COMMENT ON FUNCTION public.calcular_vencimento_por_periodicidade(date, text) IS
  'Canonico (Epic 003): unica fonte de verdade do proximo_vencimento por periodicidade. Espelhado em src/utils/vencimento.ts (UX otimista; DB e autoridade).';

-- ROLLBACK (manual):
--   DROP TRIGGER IF EXISTS trg_cliente_planos_set_vencimento ON public.cliente_planos;
--   DROP FUNCTION IF EXISTS public.cliente_planos_set_vencimento();
