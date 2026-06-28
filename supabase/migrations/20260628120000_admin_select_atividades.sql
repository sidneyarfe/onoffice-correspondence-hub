-- O admin não conseguia LER `atividades_cliente` (só havia policy de SELECT do dono), então a aba
-- Atividades da ficha aparecia vazia e o histórico de notificações de uma fatura não era legível.
-- Aditiva/idempotente. is_admin(uuid) já existe.

DROP POLICY IF EXISTS "Admins veem atividades" ON public.atividades_cliente;
CREATE POLICY "Admins veem atividades" ON public.atividades_cliente
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ROLLBACK (manual):
--   DROP POLICY IF EXISTS "Admins veem atividades" ON public.atividades_cliente;
