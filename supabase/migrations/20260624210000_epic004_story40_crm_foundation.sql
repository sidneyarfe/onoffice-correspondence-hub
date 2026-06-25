-- Epic 004 · Story 4.0 — Fundação de dados do CRM (leads, negócios, atividades, etapas, tags)
-- Migração ADITIVA e idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS). Não toca tabelas existentes.
-- Decisões: etapas customizáveis (tabela de config) + tags em contatos E negócios.
-- RLS: admin-only via profiles.role='admin' (padrão do projeto). Inserts públicos de lead NÃO usam
--      policy anon — vêm da Edge Function capturar-lead com service role (que ignora RLS). Story 4.1.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0a. Helper de updated_at (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0b. Helper de admin — espelha o modelo DUAL do app (allowlist de e-mail OU profiles.role='admin').
--     Necessário porque os admins principais (gmail da allowlist) NÃO têm profiles.role='admin';
--     uma policy só por profiles.role deixaria o CRM vazio justamente para eles.
--     ⚠️ A allowlist é DUPLICADA no app (AuthContext/ProtectedRoute/useAdminData…). Se mudar quem
--     é admin, atualize aqui também. SECURITY DEFINER para ler profiles sob a própria RLS.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_onoffice_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN (
      'onoffice1893@gmail.com',
      'contato@onofficebelem.com.br',
      'sidneyferreira12205@gmail.com'
    )
    OR (auth.jwt() ->> 'email') LIKE '%@onoffice.com'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'),
    false
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Etapas do pipeline (config editável — sem migração para renomear/reordenar)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_etapas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  ordem      integer NOT NULL DEFAULT 0,
  cor        text,                                  -- hex opcional p/ a coluna do kanban
  tipo       text NOT NULL DEFAULT 'aberto' CHECK (tipo IN ('aberto','ganho','perdido')),
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_etapas_ordem ON public.crm_etapas (ordem);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tags (taxonomia livre, reaproveitada por contatos e negócios)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  cor        text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_tags_nome ON public.crm_tags (lower(nome));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Contatos (leads) — origem/UTM para rastrear a campanha; contratacao_id liga ao registro central
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_contatos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL,
  email          text,
  telefone       text,
  origem         text NOT NULL DEFAULT 'manual'
                   CHECK (origem IN ('google_ads','meta_ads','site','manual','indicacao','outro')),
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_term       text,
  utm_content    text,
  observacoes    text,
  responsavel    text,
  contratacao_id uuid REFERENCES public.contratacoes_clientes(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_contatos_email       ON public.crm_contatos (lower(email));
CREATE INDEX IF NOT EXISTS idx_crm_contatos_origem      ON public.crm_contatos (origem);
CREATE INDEX IF NOT EXISTS idx_crm_contatos_contratacao ON public.crm_contatos (contratacao_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Negócios (deals) — etapa_id (kanban), plano_id (pretendido), contratacao_id (quando inicia contratação)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_negocios (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id     uuid NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  titulo         text NOT NULL,
  valor_centavos integer,
  etapa_id       uuid REFERENCES public.crm_etapas(id),
  plano_id       uuid REFERENCES public.planos(id),
  contratacao_id uuid REFERENCES public.contratacoes_clientes(id),
  status         text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','ganho','perdido')),
  motivo_perda   text,
  responsavel    text,
  ordem          integer NOT NULL DEFAULT 0,        -- posição dentro da coluna do kanban
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_negocios_contato     ON public.crm_negocios (contato_id);
CREATE INDEX IF NOT EXISTS idx_crm_negocios_etapa       ON public.crm_negocios (etapa_id);
CREATE INDEX IF NOT EXISTS idx_crm_negocios_status      ON public.crm_negocios (status);
CREATE INDEX IF NOT EXISTS idx_crm_negocios_contratacao ON public.crm_negocios (contratacao_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Atividades (notas, follow-up, ligação, reunião, whatsapp, email)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_atividades (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id     uuid NOT NULL REFERENCES public.crm_negocios(id) ON DELETE CASCADE,
  tipo           text NOT NULL DEFAULT 'nota'
                   CHECK (tipo IN ('nota','ligacao','reuniao','whatsapp','followup','email')),
  descricao      text,
  data_atividade timestamptz NOT NULL DEFAULT now(),
  concluida      boolean NOT NULL DEFAULT false,
  responsavel    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_atividades_negocio ON public.crm_atividades (negocio_id);
CREATE INDEX IF NOT EXISTS idx_crm_atividades_data    ON public.crm_atividades (data_atividade);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Junções N:N de tags
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_contato_tags (
  contato_id uuid NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES public.crm_tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (contato_id, tag_id)
);
CREATE TABLE IF NOT EXISTS public.crm_negocio_tags (
  negocio_id uuid NOT NULL REFERENCES public.crm_negocios(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES public.crm_tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (negocio_id, tag_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Triggers de updated_at
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_crm_etapas_updated_at   ON public.crm_etapas;
CREATE TRIGGER trg_crm_etapas_updated_at   BEFORE UPDATE ON public.crm_etapas
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
DROP TRIGGER IF EXISTS trg_crm_contatos_updated_at ON public.crm_contatos;
CREATE TRIGGER trg_crm_contatos_updated_at BEFORE UPDATE ON public.crm_contatos
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
DROP TRIGGER IF EXISTS trg_crm_negocios_updated_at ON public.crm_negocios;
CREATE TRIGGER trg_crm_negocios_updated_at BEFORE UPDATE ON public.crm_negocios
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS — admin-only (service role ignora RLS; lead insert vem da Edge fn na Story 4.1)
--    Idempotente: DROP POLICY IF EXISTS antes de cada CREATE.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  crm_tables text[] := ARRAY[
    'crm_etapas','crm_tags','crm_contatos','crm_negocios',
    'crm_atividades','crm_contato_tags','crm_negocio_tags'
  ];
BEGIN
  FOREACH t IN ARRAY crm_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %1$s" ON public.%1$I;', t);
    EXECUTE format($p$
      CREATE POLICY "Admins manage %1$s" ON public.%1$I
        FOR ALL
        USING (public.is_onoffice_admin())
        WITH CHECK (public.is_onoffice_admin());
    $p$, t);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Seed do pipeline padrão (só se a tabela estiver vazia — editável depois)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.crm_etapas (nome, ordem, cor, tipo)
SELECT v.nome, v.ordem, v.cor, v.tipo
FROM (VALUES
  ('Novo Lead',       1, '#60FF00', 'aberto'),
  ('Contato Feito',   2, '#38BDF8', 'aberto'),
  ('Qualificado',     3, '#A78BFA', 'aberto'),
  ('Contrato Enviado',4, '#FBBF24', 'aberto'),
  ('Negociação',      5, '#FB923C', 'aberto'),
  ('Ganho',           6, '#22C55E', 'ganho'),
  ('Perdido',         7, '#EF4444', 'perdido')
) AS v(nome, ordem, cor, tipo)
WHERE NOT EXISTS (SELECT 1 FROM public.crm_etapas);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Documentação inline
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.crm_etapas    IS 'Etapas do pipeline do CRM (config editável). tipo: aberto|ganho|perdido.';
COMMENT ON TABLE public.crm_contatos  IS 'Leads/contatos do CRM. origem rastreia a campanha; contratacao_id liga ao registro central quando vira contratação.';
COMMENT ON TABLE public.crm_negocios  IS 'Negócios (deals). etapa_id = coluna do kanban; contratacao_id preenchido quando a contratação é iniciada pelo deal (Epic 004 Story 4.4).';
COMMENT ON TABLE public.crm_atividades IS 'Atividades do negócio: nota|ligacao|reuniao|whatsapp|followup|email.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (manual):
--   DROP TABLE IF EXISTS public.crm_negocio_tags, public.crm_contato_tags,
--     public.crm_atividades, public.crm_negocios, public.crm_contatos,
--     public.crm_tags, public.crm_etapas CASCADE;
--   DROP FUNCTION IF EXISTS public.crm_set_updated_at();
--   DROP FUNCTION IF EXISTS public.is_onoffice_admin();
-- ─────────────────────────────────────────────────────────────────────────────
