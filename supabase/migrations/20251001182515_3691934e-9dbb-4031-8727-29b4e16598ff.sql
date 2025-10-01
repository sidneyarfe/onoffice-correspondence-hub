-- Adiciona a coluna para o número de parcelas a serem exibidas
ALTER TABLE public.planos
ADD COLUMN numero_parcelas INTEGER NOT NULL DEFAULT 1;

-- Adiciona a coluna para o valor da parcela (em centavos) a ser exibido
-- Esta coluna pode ser nula, caso um plano não tenha exibição de parcelamento
ALTER TABLE public.planos
ADD COLUMN valor_parcela_centavos INTEGER;