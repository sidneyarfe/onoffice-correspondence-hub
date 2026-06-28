-- Fix RLS: o painel admin (browser, anon key + sessão admin) não conseguia ESCREVER em
-- `pagamentos` nem `documentos_cliente` — essas tabelas só tinham policy de SELECT do dono.
-- Resultado: erro ao cobrar pedido avulso, emitir cobrança, registrar pagamento e anexar/registrar
-- documentos. Aditiva e idempotente. is_admin(uuid) já existe (usado em pedidos/5.4).

-- pagamentos -----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins gerenciam pagamentos" ON public.pagamentos;
CREATE POLICY "Admins gerenciam pagamentos" ON public.pagamentos
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- documentos_cliente ---------------------------------------------------------
DROP POLICY IF EXISTS "Admins gerenciam documentos_cliente" ON public.documentos_cliente;
CREATE POLICY "Admins gerenciam documentos_cliente" ON public.documentos_cliente
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ROLLBACK (manual):
--   DROP POLICY IF EXISTS "Admins gerenciam pagamentos" ON public.pagamentos;
--   DROP POLICY IF EXISTS "Admins gerenciam documentos_cliente" ON public.documentos_cliente;
