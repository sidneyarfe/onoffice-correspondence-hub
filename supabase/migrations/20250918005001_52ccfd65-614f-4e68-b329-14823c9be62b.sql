-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_auto_assign_product_plan ON public.contratacoes_clientes;
DROP FUNCTION IF EXISTS public.auto_assign_product_plan();

-- Create improved function with exact string matching
CREATE OR REPLACE FUNCTION public.auto_assign_product_plan()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  produto_encontrado_id UUID;
  plano_encontrado_id UUID;
BEGIN
  -- Only execute when status_contratacao changes to ATIVO
  IF NEW.status_contratacao = 'ATIVO' AND (OLD.status_contratacao IS NULL OR OLD.status_contratacao != 'ATIVO') THEN
    
    -- Find product by exact match with produto_selecionado
    IF NEW.produto_selecionado IS NOT NULL THEN
      SELECT id INTO produto_encontrado_id 
      FROM produtos 
      WHERE nome_produto = NEW.produto_selecionado 
      AND ativo = true;
      
      -- If product found, look for the plan within that product
      IF produto_encontrado_id IS NOT NULL AND NEW.plano_selecionado IS NOT NULL THEN
        SELECT id INTO plano_encontrado_id 
        FROM planos 
        WHERE nome_plano = NEW.plano_selecionado 
        AND produto_id = produto_encontrado_id 
        AND ativo = true;
      END IF;
      
      -- Update the contract with found IDs
      NEW.produto_id := produto_encontrado_id;
      NEW.plano_id := plano_encontrado_id;
      
      -- Log the operation
      RAISE LOG 'Auto-assigned produto_id: % (%s) and plano_id: % (%s) for contratacao: %', 
        produto_encontrado_id, NEW.produto_selecionado, plano_encontrado_id, NEW.plano_selecionado, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER trigger_auto_assign_product_plan
  BEFORE UPDATE ON public.contratacoes_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_product_plan();

-- Fix existing quickhelp client and any others with wrong assignments
UPDATE public.contratacoes_clientes 
SET 
  produto_id = (
    SELECT p.id 
    FROM produtos p 
    WHERE p.nome_produto = produto_selecionado 
    AND p.ativo = true
  ),
  plano_id = (
    SELECT pl.id 
    FROM planos pl 
    JOIN produtos p ON pl.produto_id = p.id
    WHERE pl.nome_plano = plano_selecionado 
    AND p.nome_produto = produto_selecionado
    AND pl.ativo = true 
    AND p.ativo = true
  )
WHERE status_contratacao = 'ATIVO' 
AND produto_selecionado IS NOT NULL 
AND (
  produto_id IS NULL 
  OR plano_id IS NULL
  OR produto_id != (
    SELECT p.id 
    FROM produtos p 
    WHERE p.nome_produto = produto_selecionado 
    AND p.ativo = true
  )
);