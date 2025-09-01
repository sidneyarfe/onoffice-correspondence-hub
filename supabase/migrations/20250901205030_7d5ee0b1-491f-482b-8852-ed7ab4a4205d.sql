-- Adicionar campos faltantes na tabela signup_submissions
ALTER TABLE public.signup_submissions 
ADD COLUMN cpf_responsavel TEXT,
ADD COLUMN razao_social TEXT,
ADD COLUMN cnpj TEXT,
ADD COLUMN endereco TEXT,
ADD COLUMN numero_endereco TEXT,
ADD COLUMN complemento_endereco TEXT,
ADD COLUMN bairro TEXT,
ADD COLUMN cidade TEXT,
ADD COLUMN estado TEXT,
ADD COLUMN cep TEXT;