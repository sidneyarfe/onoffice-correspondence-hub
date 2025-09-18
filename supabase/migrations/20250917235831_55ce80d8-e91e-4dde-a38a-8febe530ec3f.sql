-- Remover a constraint de validação de CNPJ existente se houver
ALTER TABLE public.contratacoes_clientes
DROP CONSTRAINT IF EXISTS valid_cnpj;

-- Adicionar nova constraint condicional para CNPJ baseada no tipo_pessoa
-- Esta regra só valida o CNPJ se o tipo_pessoa for 'juridica'
-- Se for 'fisica', a regra é ignorada
ALTER TABLE public.contratacoes_clientes
ADD CONSTRAINT check_cnpj_if_juridica
CHECK (
    (tipo_pessoa = 'fisica') OR
    (tipo_pessoa = 'juridica' AND cnpj IS NOT NULL AND length(cnpj) > 0 AND public.validate_cnpj(cnpj))
);