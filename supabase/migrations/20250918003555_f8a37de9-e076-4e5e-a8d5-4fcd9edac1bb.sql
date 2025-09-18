-- Criar função para atribuir automaticamente produto_id e plano_id quando status vira ATIVO
CREATE OR REPLACE FUNCTION public.auto_assign_product_plan()
RETURNS TRIGGER AS $$
DECLARE
  produto_encontrado_id UUID;
  plano_encontrado_id UUID;
BEGIN
  -- Só executar quando status_contratacao mudar para ATIVO
  IF NEW.status_contratacao = 'ATIVO' AND (OLD.status_contratacao IS NULL OR OLD.status_contratacao != 'ATIVO') THEN
    
    -- Buscar produto "Endereço Fiscal" (assumindo que é o produto padrão)
    SELECT id INTO produto_encontrado_id 
    FROM produtos 
    WHERE nome_produto ILIKE '%endereço fiscal%' 
    AND ativo = true 
    LIMIT 1;
    
    -- Se não encontrou produto específico, pegar o primeiro produto ativo
    IF produto_encontrado_id IS NULL THEN
      SELECT id INTO produto_encontrado_id 
      FROM produtos 
      WHERE ativo = true 
      LIMIT 1;
    END IF;
    
    -- Buscar plano baseado no plano_selecionado
    IF produto_encontrado_id IS NOT NULL THEN
      -- Mapear plano_selecionado para o plano correto
      CASE NEW.plano_selecionado
        WHEN '1 ANO' THEN
          SELECT id INTO plano_encontrado_id 
          FROM planos 
          WHERE produto_id = produto_encontrado_id 
          AND (nome_plano ILIKE '%anual%' OR periodicidade = 'anual')
          AND ativo = true 
          LIMIT 1;
        WHEN '6 MESES' THEN
          SELECT id INTO plano_encontrado_id 
          FROM planos 
          WHERE produto_id = produto_encontrado_id 
          AND (nome_plano ILIKE '%semestral%' OR periodicidade = 'semestral')
          AND ativo = true 
          LIMIT 1;
        WHEN '1 MES' THEN
          SELECT id INTO plano_encontrado_id 
          FROM planos 
          WHERE produto_id = produto_encontrado_id 
          AND (nome_plano ILIKE '%mensal%' OR periodicidade = 'mensal')
          AND ativo = true 
          LIMIT 1;
        ELSE
          -- Default para plano anual
          SELECT id INTO plano_encontrado_id 
          FROM planos 
          WHERE produto_id = produto_encontrado_id 
          AND (nome_plano ILIKE '%anual%' OR periodicidade = 'anual')
          AND ativo = true 
          LIMIT 1;
      END CASE;
      
      -- Se não encontrou plano específico, pegar o primeiro plano ativo do produto
      IF plano_encontrado_id IS NULL THEN
        SELECT id INTO plano_encontrado_id 
        FROM planos 
        WHERE produto_id = produto_encontrado_id 
        AND ativo = true 
        LIMIT 1;
      END IF;
      
      -- Atualizar os campos produto_id e plano_id
      NEW.produto_id := produto_encontrado_id;
      NEW.plano_id := plano_encontrado_id;
      
      -- Log da operação
      RAISE LOG 'Auto-atribuído produto_id: % e plano_id: % para contratação: %', 
        produto_encontrado_id, plano_encontrado_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para executar a função
DROP TRIGGER IF EXISTS trigger_auto_assign_product_plan ON public.contratacoes_clientes;
CREATE TRIGGER trigger_auto_assign_product_plan
  BEFORE UPDATE ON public.contratacoes_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_product_plan();

-- Aplicar a função para clientes já ATIVOS que não têm produto_id/plano_id
DO $$
DECLARE
  cliente_record RECORD;
  produto_encontrado_id UUID;
  plano_encontrado_id UUID;
BEGIN
  -- Buscar produto "Endereço Fiscal" (assumindo que é o produto padrão)
  SELECT id INTO produto_encontrado_id 
  FROM produtos 
  WHERE nome_produto ILIKE '%endereço fiscal%' 
  AND ativo = true 
  LIMIT 1;
  
  -- Se não encontrou produto específico, pegar o primeiro produto ativo
  IF produto_encontrado_id IS NULL THEN
    SELECT id INTO produto_encontrado_id 
    FROM produtos 
    WHERE ativo = true 
    LIMIT 1;
  END IF;
  
  -- Processar cada cliente ATIVO sem produto_id/plano_id
  FOR cliente_record IN 
    SELECT * FROM contratacoes_clientes 
    WHERE status_contratacao = 'ATIVO' 
    AND (produto_id IS NULL OR plano_id IS NULL)
  LOOP
    plano_encontrado_id := NULL;
    
    -- Buscar plano baseado no plano_selecionado
    IF produto_encontrado_id IS NOT NULL THEN
      CASE cliente_record.plano_selecionado
        WHEN '1 ANO' THEN
          SELECT id INTO plano_encontrado_id 
          FROM planos 
          WHERE produto_id = produto_encontrado_id 
          AND (nome_plano ILIKE '%anual%' OR periodicidade = 'anual')
          AND ativo = true 
          LIMIT 1;
        WHEN '6 MESES' THEN
          SELECT id INTO plano_encontrado_id 
          FROM planos 
          WHERE produto_id = produto_encontrado_id 
          AND (nome_plano ILIKE '%semestral%' OR periodicidade = 'semestral')
          AND ativo = true 
          LIMIT 1;
        WHEN '1 MES' THEN
          SELECT id INTO plano_encontrado_id 
          FROM planos 
          WHERE produto_id = produto_encontrado_id 
          AND (nome_plano ILIKE '%mensal%' OR periodicidade = 'mensal')
          AND ativo = true 
          LIMIT 1;
        ELSE
          -- Default para plano anual
          SELECT id INTO plano_encontrado_id 
          FROM planos 
          WHERE produto_id = produto_encontrado_id 
          AND (nome_plano ILIKE '%anual%' OR periodicidade = 'anual')
          AND ativo = true 
          LIMIT 1;
      END CASE;
      
      -- Se não encontrou plano específico, pegar o primeiro plano ativo do produto
      IF plano_encontrado_id IS NULL THEN
        SELECT id INTO plano_encontrado_id 
        FROM planos 
        WHERE produto_id = produto_encontrado_id 
        AND ativo = true 
        LIMIT 1;
      END IF;
      
      -- Atualizar os campos produto_id e plano_id
      UPDATE contratacoes_clientes 
      SET produto_id = produto_encontrado_id,
          plano_id = plano_encontrado_id,
          updated_at = NOW()
      WHERE id = cliente_record.id;
      
      RAISE LOG 'Corrigido cliente existente - produto_id: % e plano_id: % para contratação: %', 
        produto_encontrado_id, plano_encontrado_id, cliente_record.id;
    END IF;
  END LOOP;
END $$;