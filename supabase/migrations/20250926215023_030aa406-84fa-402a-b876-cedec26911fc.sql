-- Converter todos os preços existentes de Reais para centavos
-- Multiplicar por 100 todos os valores na coluna preco que não são nulos
UPDATE public.contratacoes_clientes
SET preco = preco * 100
WHERE preco IS NOT NULL;