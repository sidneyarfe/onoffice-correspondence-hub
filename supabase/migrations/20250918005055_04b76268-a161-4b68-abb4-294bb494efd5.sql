-- Fix function search path for security - drop trigger first
DROP TRIGGER IF EXISTS trigger_auto_assign_product_plan ON public.contratacoes_clientes;
DROP FUNCTION IF EXISTS public.auto_assign_product_plan();

CREATE OR REPLACE FUNCTION public.auto_assign_product_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Recreate the trigger
CREATE TRIGGER trigger_auto_assign_product_plan
  BEFORE UPDATE ON public.contratacoes_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_product_plan();