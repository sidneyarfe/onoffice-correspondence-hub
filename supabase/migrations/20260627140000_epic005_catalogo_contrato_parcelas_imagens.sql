-- Epic 005 (follow-up) — Catálogo: "com contrato", parcelas opcionais, imagens/capa nas ofertas
-- Aditiva e idempotente.

-- 1. produtos.exige_contrato — só produtos "com contrato" expõem templates ZapSign nas ofertas
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS exige_contrato boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.produtos.exige_contrato IS
  'Se true, as ofertas deste produto pedem templates ZapSign (contrato). Default false.';

-- 2. planos.mostrar_parcelas — parcelamento só aparece se o usuário definir
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS mostrar_parcelas boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.planos.mostrar_parcelas IS
  'Se true, exibe o parcelamento (numero_parcelas/valor_parcela_centavos) na vitrine. Default false.';

-- 3. imagens da oferta (opcional) + capa
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS imagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS imagem_capa_url text;
COMMENT ON COLUMN public.planos.imagens IS 'URLs públicas das imagens da oferta (bucket ofertas). Array.';
COMMENT ON COLUMN public.planos.imagem_capa_url IS 'URL da imagem de capa (uma das de `imagens`).';

-- 4. Bucket público para imagens de ofertas
INSERT INTO storage.buckets (id, name, public) VALUES ('ofertas', 'ofertas', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ofertas_public_read" ON storage.objects;
CREATE POLICY "ofertas_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'ofertas');
DROP POLICY IF EXISTS "ofertas_auth_write" ON storage.objects;
CREATE POLICY "ofertas_auth_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ofertas');
DROP POLICY IF EXISTS "ofertas_auth_update" ON storage.objects;
CREATE POLICY "ofertas_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ofertas');
DROP POLICY IF EXISTS "ofertas_auth_delete" ON storage.objects;
CREATE POLICY "ofertas_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ofertas');

-- ROLLBACK (manual):
--   ALTER TABLE public.planos DROP COLUMN IF EXISTS imagens, DROP COLUMN IF EXISTS imagem_capa_url,
--     DROP COLUMN IF EXISTS mostrar_parcelas;
--   ALTER TABLE public.produtos DROP COLUMN IF EXISTS exige_contrato;
--   (bucket/policies: manter ou remover manualmente)
