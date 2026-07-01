-- Epic 005 · Story 5.6 — Identidade: rename contratacoes_clientes → clientes + enderecos_fiscais
-- SEGURO via VIEW de compat: a análise de impacto mostrou 25 usos `.from('contratacoes_clientes')`
-- diretos e ZERO embeds PostgREST (FK embedding). FKs/RLS/triggers seguem o rename automaticamente.
-- A view de compat (security_invoker, auto-updatable) mantém os 25 consumidores + 7 edge functions
-- funcionando SEM mudança de código. Migrar consumidores para `clientes` é gradual (pós-aplicação).

-- 1. Rename físico (guard idempotente) ----------------------------------------
DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='contratacoes_clientes' AND table_type='BASE TABLE'
     )
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='clientes'
     ) THEN
    ALTER TABLE public.contratacoes_clientes RENAME TO clientes;
  END IF;
END $$;

-- 2. VIEW de compat `contratacoes_clientes` → clientes ------------------------
CREATE OR REPLACE VIEW public.contratacoes_clientes WITH (security_invoker = true) AS
  SELECT * FROM public.clientes;
COMMENT ON VIEW public.contratacoes_clientes IS
  'Compat (Epic 005/5.6): aponta para clientes (ex-contratacoes_clientes). Migrar consumidores p/ clientes.';

-- 3. enderecos_fiscais (pool de endereços virtuais ATRIBUÍDOS) ----------------
CREATE TABLE IF NOT EXISTS public.enderecos_fiscais (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotulo      text,                       -- ex.: "Matriz Belém — Sala 12"
  logradouro  text NOT NULL,
  numero      text,
  complemento text,
  bairro      text,
  cidade      text NOT NULL,
  estado      text NOT NULL,
  cep         text NOT NULL,
  disponivel  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.enderecos_fiscais IS
  'Pool de endereços fiscais virtuais que ATRIBUÍMOS às assinaturas (≠ endereço do cliente em clientes.endereco).';

-- 4. Atribuição: FK na assinatura (1 endereço fiscal por assinatura) ----------
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS endereco_fiscal_id uuid REFERENCES public.enderecos_fiscais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assinaturas_endereco_fiscal ON public.assinaturas (endereco_fiscal_id);

-- 5. RLS de enderecos_fiscais (admin gerencia; cliente vê o atribuído a si) ----
ALTER TABLE public.enderecos_fiscais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gerenciam enderecos_fiscais" ON public.enderecos_fiscais;
CREATE POLICY "Admins gerenciam enderecos_fiscais" ON public.enderecos_fiscais FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clientes veem seu endereco fiscal" ON public.enderecos_fiscais;
CREATE POLICY "Clientes veem seu endereco fiscal" ON public.enderecos_fiscais FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.assinaturas a
    JOIN public.clientes c ON c.id = a.cliente_id
    WHERE a.endereco_fiscal_id = enderecos_fiscais.id AND c.user_id = auth.uid()
  )
);

-- 6. Re-apontar policies de pedidos/contratos para `clientes` (eram contratacoes_clientes) -------
DROP POLICY IF EXISTS "Clientes veem seus pedidos" ON public.pedidos;
CREATE POLICY "Clientes veem seus pedidos" ON public.pedidos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = pedidos.cliente_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Clientes veem seus pedido_itens" ON public.pedido_itens;
CREATE POLICY "Clientes veem seus pedido_itens" ON public.pedido_itens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    JOIN public.clientes c ON c.id = p.cliente_id
    WHERE p.id = pedido_itens.pedido_id AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Clientes veem seus contratos" ON public.contratos;
CREATE POLICY "Clientes veem seus contratos" ON public.contratos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = contratos.cliente_id AND c.user_id = auth.uid())
);

-- ROLLBACK (manual):
--   ALTER TABLE public.assinaturas DROP COLUMN IF EXISTS endereco_fiscal_id;
--   DROP TABLE IF EXISTS public.enderecos_fiscais;
--   DROP VIEW IF EXISTS public.contratacoes_clientes;
--   ALTER TABLE public.clientes RENAME TO contratacoes_clientes;
