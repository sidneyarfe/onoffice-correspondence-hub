-- ============================================================================
-- Atividades — registrar QUEM realizou a ação (ator), não só o cliente-dono.
-- Antes, `atividades_cliente.user_id` guardava apenas o cliente (dono do feed),
-- então o log da dashboard exibia o nome do responsável do cliente como se fosse
-- o autor da ação (ex.: aparecia "Francisco Junior" para uma ação do admin sobre
-- o cliente "SCAULT"). Agora a RPC captura o ator via auth.uid():
--   • admin   → há sessão e o ator é diferente do dono do feed (ação do time);
--   • cliente → há sessão e o ator é o próprio dono do feed;
--   • sistema → sem sessão (edge functions / service_role) = ação automática.
-- Registros antigos ficam com ator NULO (não dá para atribuir retroativamente);
-- o front trata isso exibindo o cliente relacionado normalmente.
-- ============================================================================

ALTER TABLE public.atividades_cliente
  ADD COLUMN IF NOT EXISTS ator_id   UUID,
  ADD COLUMN IF NOT EXISTS ator_nome TEXT,
  ADD COLUMN IF NOT EXISTS ator_tipo TEXT;  -- 'cliente' | 'admin' | 'sistema'

CREATE OR REPLACE FUNCTION public.registrar_atividade(p_user_id uuid, p_acao text, p_descricao text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_ator_id   uuid := auth.uid();
  v_ator_nome text;
  v_ator_tipo text;
BEGIN
  IF v_ator_id IS NULL THEN
    -- Sem sessão autenticada (edge function / service_role) → ação automática
    v_ator_tipo := 'sistema';
    v_ator_nome := 'Sistema';
  ELSE
    SELECT full_name INTO v_ator_nome FROM public.profiles WHERE id = v_ator_id;
    v_ator_nome := COALESCE(v_ator_nome, 'Usuário');
    -- ator == dono do feed ⇒ o próprio cliente; caso contrário, ação do time (admin)
    v_ator_tipo := CASE WHEN v_ator_id = p_user_id THEN 'cliente' ELSE 'admin' END;
  END IF;

  INSERT INTO public.atividades_cliente (user_id, acao, descricao, ator_id, ator_nome, ator_tipo)
  VALUES (p_user_id, p_acao, p_descricao, v_ator_id, v_ator_nome, v_ator_tipo);
END;
$function$;
