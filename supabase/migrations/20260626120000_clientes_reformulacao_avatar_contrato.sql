-- ============================================================================
-- Reformulação da página Clientes (admin)
-- Adiciona:
--   1. contratacoes_clientes.avatar_url        (foto do cliente — modal Editar / Perfil)
--   2. contratacoes_clientes.contrato_assinado_url (PDF do contrato assinado anexado manualmente)
--   3. Storage buckets: 'avatars' (público) e 'contratos' (privado)
--   4. Policies de storage para usuários autenticados (admin opera com sessão Supabase Auth)
--
-- Aplicar com:  supabase db push
-- Depois regenerar os tipos:  supabase gen types typescript --linked > src/integrations/supabase/types.ts
-- ============================================================================

-- 1 + 2. Colunas novas (idempotente) ----------------------------------------
ALTER TABLE public.contratacoes_clientes
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS contrato_assinado_url text;

COMMENT ON COLUMN public.contratacoes_clientes.avatar_url IS
  'URL pública da foto do cliente (bucket avatars). Definida no modal Editar e na página Perfil.';
COMMENT ON COLUMN public.contratacoes_clientes.contrato_assinado_url IS
  'URL do contrato assinado anexado manualmente pelo admin (bucket contratos). Vincula o contrato ao cliente.';

-- 3. Buckets -----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos', 'contratos', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Policies de storage -----------------------------------------------------
-- avatars: leitura pública, escrita por autenticados (a UI é admin-only no app layer)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_write" ON storage.objects;
CREATE POLICY "avatars_auth_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
CREATE POLICY "avatars_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- contratos: privado — leitura/escrita apenas por autenticados (refinar p/ dono no futuro)
DROP POLICY IF EXISTS "contratos_auth_read" ON storage.objects;
CREATE POLICY "contratos_auth_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contratos');

DROP POLICY IF EXISTS "contratos_auth_write" ON storage.objects;
CREATE POLICY "contratos_auth_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contratos');

DROP POLICY IF EXISTS "contratos_auth_update" ON storage.objects;
CREATE POLICY "contratos_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contratos');

DROP POLICY IF EXISTS "contratos_auth_delete" ON storage.objects;
CREATE POLICY "contratos_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contratos');
