-- Epic 005 · Story 5.4 — Comércio: assinaturas (rename de cliente_planos) + pedidos/itens (avulsos)
-- Aditiva/segura: rename com guard idempotente + VIEW de compat (security_invoker) auto-updatable,
-- então consumidores antigos de `cliente_planos` (hooks, edge fns, triggers) seguem funcionando.

-- 1. Rename cliente_planos → assinaturas (idempotente) -------------------------
DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='cliente_planos' AND table_type='BASE TABLE'
     )
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='assinaturas'
     ) THEN
    ALTER TABLE public.cliente_planos RENAME TO assinaturas;
  END IF;
END $$;

-- 2. VIEW de compat `cliente_planos` → assinaturas ----------------------------
--    security_invoker=true: herda a RLS de assinaturas. SELECT * de 1 tabela = auto-updatable,
--    então INSERT/UPDATE/DELETE de consumidores legados continuam passando para assinaturas.
CREATE OR REPLACE VIEW public.cliente_planos WITH (security_invoker = true) AS
  SELECT * FROM public.assinaturas;
COMMENT ON VIEW public.cliente_planos IS
  'Compat (Epic 005/5.4): aponta para assinaturas (ex-cliente_planos). Migrar consumidores p/ assinaturas.';

-- 3. pedidos (cabeçalho de venda avulsa) + pedido_itens (linhas) ---------------
CREATE TABLE IF NOT EXISTS public.pedidos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL REFERENCES public.contratacoes_clientes(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','pago','cancelado')),
  data_pedido  timestamptz NOT NULL DEFAULT now(),
  observacao   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedido_itens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id           uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id          uuid REFERENCES public.produtos(id),
  plano_id            uuid REFERENCES public.planos(id),
  descricao           text,
  quantidade          numeric NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  unidade             text,
  preco_unit_centavos integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id     ON public.pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido_id ON public.pedido_itens (pedido_id);

COMMENT ON TABLE public.pedidos IS 'Venda avulsa (não recorrente) — ex.: horas de sala. Itens em pedido_itens.';
COMMENT ON COLUMN public.pedido_itens.quantidade IS 'Quantidade da unidade do plano avulso (ex.: 10 horas).';

-- 4. RLS (espelha cliente_planos: admin gerencia tudo; cliente vê o seu) -------
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gerenciam pedidos" ON public.pedidos;
CREATE POLICY "Admins gerenciam pedidos" ON public.pedidos FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Clientes veem seus pedidos" ON public.pedidos;
CREATE POLICY "Clientes veem seus pedidos" ON public.pedidos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.contratacoes_clientes c WHERE c.id = pedidos.cliente_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins gerenciam pedido_itens" ON public.pedido_itens;
CREATE POLICY "Admins gerenciam pedido_itens" ON public.pedido_itens FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Clientes veem seus pedido_itens" ON public.pedido_itens;
CREATE POLICY "Clientes veem seus pedido_itens" ON public.pedido_itens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    JOIN public.contratacoes_clientes c ON c.id = p.cliente_id
    WHERE p.id = pedido_itens.pedido_id AND c.user_id = auth.uid()
  )
);

-- ROLLBACK (manual):
--   DROP TABLE IF EXISTS public.pedido_itens;
--   DROP TABLE IF EXISTS public.pedidos;
--   DROP VIEW IF EXISTS public.cliente_planos;
--   ALTER TABLE public.assinaturas RENAME TO cliente_planos;
