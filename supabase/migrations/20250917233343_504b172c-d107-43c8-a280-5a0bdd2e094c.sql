-- Definir DEFAULT '' para campos de endereço e documentos em contratacoes_clientes
ALTER TABLE public.contratacoes_clientes
ALTER COLUMN endereco SET DEFAULT '',
ALTER COLUMN numero_endereco SET DEFAULT '',
ALTER COLUMN complemento_endereco SET DEFAULT '',
ALTER COLUMN bairro SET DEFAULT '',
ALTER COLUMN cidade SET DEFAULT '',
ALTER COLUMN estado SET DEFAULT '',
ALTER COLUMN cep SET DEFAULT '';

-- Definir DEFAULT '' para documentos e razão social
ALTER TABLE public.contratacoes_clientes
ALTER COLUMN cpf_responsavel SET DEFAULT '',
ALTER COLUMN cnpj SET DEFAULT '',
ALTER COLUMN razao_social SET DEFAULT '';