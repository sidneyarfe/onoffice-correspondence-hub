-- ============================================================================
-- Admin RLS — reconhecer admin por E-MAIL (allowlist/domínio), não só profiles.role
--
-- Bug: criar cliente pelo modal interno falhava com
--   "new row violates row-level security policy for table clientes".
-- Causa: `contratacoes_clientes` virou VIEW (security_invoker) sobre a base `clientes`
-- (Epic 005/5.6). O INSERT do browser passa a ser regido pela RLS de `clientes`, cuja
-- policy "Admins can manage all data" usa `is_admin_context()`. Essa função — e também
-- `is_admin(uuid)`, usada pelas policies de assinaturas/pedidos/pedido_itens/enderecos —
-- só checavam `profiles.role='admin'`, IGNORANDO a allowlist de e-mail/@onoffice.com que
-- o app usa (adminEmails.ts) e que a própria `is_admin()` (sem args) já respeita.
-- Resultado: admin @onoffice.com / allowlisted SEM role='admin' passa no front mas é
-- bloqueado na RLS. Antes não doía porque a criação ia por edge function (service_role,
-- auth.uid() nulo → liberado); agora é INSERT direto do browser.
--
-- Fix: alinhar `is_admin(uuid)` e `is_admin_context()` ao critério do app (role OR e-mail).
-- Mantém a allowlist em sincronia com `is_admin()` (sem args) e `adminEmails.ts`.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = user_id
        AND (
          lower(u.email) IN (
            'onoffice1893@gmail.com',
            'contato@onofficebelem.com.br',
            'sidneyferreira12205@gmail.com'
          )
          OR lower(u.email) LIKE '%@onoffice.com'
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_context()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- service_role / sem sessão (edge functions) OU admin reconhecido (role OU e-mail)
  RETURN auth.uid() IS NULL OR public.is_admin(auth.uid());
END;
$function$;
