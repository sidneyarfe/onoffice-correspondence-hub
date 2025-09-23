-- Dropar e recriar o trigger para garantir que está funcionando corretamente
DROP TRIGGER IF EXISTS trigger_auto_assign_product_plan ON public.contratacoes_clientes;

CREATE TRIGGER trigger_auto_assign_product_plan
  BEFORE UPDATE ON public.contratacoes_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_product_plan();

-- Corrigir os 5 clientes específicos que foram importados em lote
-- Atualizar clientes com Plano Anual 695
UPDATE public.contratacoes_clientes 
SET 
  produto_id = (SELECT id FROM produtos WHERE nome_produto = 'Endereço Fiscal (Pré-Plataforma)' AND ativo = true),
  plano_id = (SELECT p.id FROM planos p 
              JOIN produtos pr ON p.produto_id = pr.id 
              WHERE p.nome_plano = 'Plano Anual 695' 
              AND pr.nome_produto = 'Endereço Fiscal (Pré-Plataforma)' 
              AND p.ativo = true AND pr.ativo = true)
WHERE email IN ('arq.nbarah@gmail.com', 'pamelaqpbahia@hotmail.com') 
  AND produto_selecionado = 'Endereço Fiscal (Pré-Plataforma)'
  AND plano_selecionado = 'Plano Anual 695'
  AND status_contratacao = 'ATIVO'
  AND (produto_id IS NULL OR plano_id IS NULL);

-- Atualizar cliente com Plano Anual 895
UPDATE public.contratacoes_clientes 
SET 
  produto_id = (SELECT id FROM produtos WHERE nome_produto = 'Endereço Fiscal (Pré-Plataforma)' AND ativo = true),
  plano_id = (SELECT p.id FROM planos p 
              JOIN produtos pr ON p.produto_id = pr.id 
              WHERE p.nome_plano = 'Plano Anual 895' 
              AND pr.nome_produto = 'Endereço Fiscal (Pré-Plataforma)' 
              AND p.ativo = true AND pr.ativo = true)
WHERE email = 'wanderlaercio@gmail.com'
  AND produto_selecionado = 'Endereço Fiscal (Pré-Plataforma)'
  AND plano_selecionado = 'Plano Anual 895'
  AND status_contratacao = 'ATIVO'
  AND (produto_id IS NULL OR plano_id IS NULL);

-- Atualizar clientes com Plano Anual 995
UPDATE public.contratacoes_clientes 
SET 
  produto_id = (SELECT id FROM produtos WHERE nome_produto = 'Endereço Fiscal (Pré-Plataforma)' AND ativo = true),
  plano_id = (SELECT p.id FROM planos p 
              JOIN produtos pr ON p.produto_id = pr.id 
              WHERE p.nome_plano = 'Plano Anual 995' 
              AND pr.nome_produto = 'Endereço Fiscal (Pré-Plataforma)' 
              AND p.ativo = true AND pr.ativo = true)
WHERE email IN ('eng.florestalcibele@gmail.com', 'romulo89455177@gmail.com')
  AND produto_selecionado = 'Endereço Fiscal (Pré-Plataforma)'
  AND plano_selecionado = 'Plano Anual 995'
  AND status_contratacao = 'ATIVO'
  AND (produto_id IS NULL OR plano_id IS NULL);