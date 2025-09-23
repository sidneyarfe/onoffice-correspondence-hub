-- 1) Atualizar a função para suportar INSERT e UPDATE com preenchimento robusto
CREATE OR REPLACE FUNCTION public.auto_assign_product_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  produto_encontrado_id UUID;
  plano_encontrado_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_contratacao = 'ATIVO' THEN
      -- Encontrar produto por nome (case-insensitive, com trim)
      IF NEW.produto_id IS NULL AND NEW.produto_selecionado IS NOT NULL THEN
        SELECT id INTO produto_encontrado_id
        FROM produtos
        WHERE ativo = true
          AND trim(lower(nome_produto)) = trim(lower(NEW.produto_selecionado))
        LIMIT 1;
      ELSE
        produto_encontrado_id := NEW.produto_id;
      END IF;

      -- Encontrar plano por nome dentro do produto
      IF NEW.plano_id IS NULL AND NEW.plano_selecionado IS NOT NULL AND produto_encontrado_id IS NOT NULL THEN
        SELECT id INTO plano_encontrado_id
        FROM planos
        WHERE ativo = true
          AND produto_id = produto_encontrado_id
          AND trim(lower(nome_plano)) = trim(lower(NEW.plano_selecionado))
        LIMIT 1;
      ELSE
        plano_encontrado_id := NEW.plano_id;
      END IF;

      NEW.produto_id := COALESCE(produto_encontrado_id, NEW.produto_id);
      NEW.plano_id := COALESCE(plano_encontrado_id, NEW.plano_id);
      RAISE LOG 'auto_assign_product_plan (INSERT): produto_id % plano_id % contratacao %', NEW.produto_id, NEW.plano_id, NEW.id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Execute quando status mudou para ATIVO ou quando IDs faltam
    IF NEW.status_contratacao = 'ATIVO' AND 
       (OLD.status_contratacao IS DISTINCT FROM NEW.status_contratacao OR NEW.produto_id IS NULL OR NEW.plano_id IS NULL) THEN

      IF NEW.produto_id IS NULL AND NEW.produto_selecionado IS NOT NULL THEN
        SELECT id INTO produto_encontrado_id
        FROM produtos
        WHERE ativo = true
          AND trim(lower(nome_produto)) = trim(lower(NEW.produto_selecionado))
        LIMIT 1;
      ELSE
        produto_encontrado_id := NEW.produto_id;
      END IF;

      IF NEW.plano_id IS NULL AND NEW.plano_selecionado IS NOT NULL AND produto_encontrado_id IS NOT NULL THEN
        SELECT id INTO plano_encontrado_id
        FROM planos
        WHERE ativo = true
          AND produto_id = produto_encontrado_id
          AND trim(lower(nome_plano)) = trim(lower(NEW.plano_selecionado))
        LIMIT 1;
      ELSE
        plano_encontrado_id := NEW.plano_id;
      END IF;

      NEW.produto_id := COALESCE(produto_encontrado_id, NEW.produto_id);
      NEW.plano_id := COALESCE(plano_encontrado_id, NEW.plano_id);
      RAISE LOG 'auto_assign_product_plan (UPDATE): produto_id % plano_id % contratacao %', NEW.produto_id, NEW.plano_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Garantir que o trigger cobre INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_auto_assign_product_plan ON public.contratacoes_clientes;
CREATE TRIGGER trigger_auto_assign_product_plan
  BEFORE INSERT OR UPDATE ON public.contratacoes_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_product_plan();

-- 3) Atribuir produto_id e plano_id para os 3 emails informados, com match seguro por nome
UPDATE public.contratacoes_clientes cc
SET 
  produto_id = p.id,
  plano_id = pl.id
FROM produtos p
JOIN planos pl ON pl.produto_id = p.id AND pl.ativo = true
WHERE cc.email IN ('pamelaqpbahia@hotmail.com','wanderlaercio@gmail.com','romulo89455177@gmail.com')
  AND cc.status_contratacao = 'ATIVO'
  AND p.ativo = true
  AND trim(lower(p.nome_produto)) = trim(lower(cc.produto_selecionado))
  AND trim(lower(pl.nome_plano)) = trim(lower(cc.plano_selecionado))
  AND (cc.produto_id IS NULL OR cc.plano_id IS NULL);
