-- Permitir valores nulos na coluna plano_selecionado para permitir clientes sem plano
ALTER TABLE public.contratacoes_clientes 
ALTER COLUMN plano_selecionado DROP NOT NULL;