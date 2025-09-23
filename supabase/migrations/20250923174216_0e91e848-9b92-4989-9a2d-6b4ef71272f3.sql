-- Remove CPF/CNPJ strict validation checks from contratacoes_clientes
ALTER TABLE public.contratacoes_clientes
  DROP CONSTRAINT IF EXISTS valid_cpf_or_placeholder;

ALTER TABLE public.contratacoes_clientes
  DROP CONSTRAINT IF EXISTS check_cnpj_if_juridica;

-- Keep other integrity checks (status, tipo_pessoa, email) intact