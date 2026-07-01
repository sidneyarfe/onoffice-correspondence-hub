-- ============================================================================
-- Admin RLS (definitivo) — alinhar 100% ao critério do app para "quem é admin".
--
-- O erro "new row violates RLS policy for table clientes" PERSISTIU após
-- 20260701140000 porque o SQL usava `LIKE '%@onoffice.com'` (termina em), enquanto
-- o front (`adminEmails.ts`) usa `email.includes('@onoffice.com')` (CONTÉM). Logo um
-- admin como `gabriel@onoffice.com.br` passa no front mas falhava no banco (não termina
-- em `@onoffice.com`). Aqui usamos `LIKE '%@onoffice.com%'` (contém), espelhando o front.
--
-- Também consolidamos TODAS as fontes de verdade de admin, para não voltar a divergir:
--   1) profiles.role = 'admin'
--   2) e-mail exato na allowlist  (onoffice1893 / contato@onofficebelem / sidneyferreira12205)
--   3) e-mail CONTÉM '@onoffice.com'  (mesma regra do front)
--   4) e-mail ativo em admin_users
-- Atualiza is_admin(), is_admin(uuid) e is_admin_context() de forma consistente.
-- ============================================================================

-- 1) is_admin(uuid) — usada por assinaturas/pedidos/pagamentos/documentos_cliente/enderecos
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = user_id
        AND (
          lower(u.email) IN (
            'onoffice1893@gmail.com',
            'contato@onofficebelem.com.br',
            'sidneyferreira12205@gmail.com'
          )
          OR lower(u.email) LIKE '%@onoffice.com%'
          OR EXISTS (
            SELECT 1 FROM public.admin_users a
            WHERE lower(a.email) = lower(u.email) AND a.is_active
          )
        )
    );
$function$;

-- 2) is_admin() (sem args) — usada por várias policies e storage
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ue text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  ue := lower(auth.email());

  IF ue IN (
    'onoffice1893@gmail.com',
    'contato@onofficebelem.com.br',
    'sidneyferreira12205@gmail.com'
  ) THEN
    RETURN true;
  END IF;

  IF ue LIKE '%@onoffice.com%' THEN
    RETURN true;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN true;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users a WHERE lower(a.email) = ue AND a.is_active) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- 3) is_admin_context() — usada pela policy "Admins can manage all data" de `clientes`
CREATE OR REPLACE FUNCTION public.is_admin_context()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- service_role / sem sessão (edge functions) OU admin reconhecido por qualquer fonte
  RETURN auth.uid() IS NULL OR public.is_admin(auth.uid());
END;
$function$;
