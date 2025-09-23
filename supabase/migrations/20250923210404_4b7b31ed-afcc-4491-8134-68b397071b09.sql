-- Adicionar campo para controlar visibilidade pública dos planos
ALTER TABLE public.planos 
ADD COLUMN listado_publicamente boolean NOT NULL DEFAULT true;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.planos.listado_publicamente IS 'Controla se o plano é visível na página pública de planos. Planos não listados continuam ativos mas não aparecem publicamente.';