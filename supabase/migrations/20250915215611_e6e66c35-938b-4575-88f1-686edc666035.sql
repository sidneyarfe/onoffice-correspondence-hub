-- 1. Adicionar periodicidade na tabela planos (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'planos' AND column_name = 'periodicidade') THEN
        ALTER TABLE public.planos 
        ADD COLUMN periodicidade text DEFAULT 'anual' 
        CHECK (periodicidade IN ('semanal', 'mensal', 'trimestral', 'semestral', 'anual', 'bianual'));
    END IF;
END$$;

-- 2. Adicionar campos na tabela contratacoes_clientes (se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contratacoes_clientes' AND column_name = 'data_encerramento') THEN
        ALTER TABLE public.contratacoes_clientes ADD COLUMN data_encerramento date;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contratacoes_clientes' AND column_name = 'proximo_vencimento_editavel') THEN
        ALTER TABLE public.contratacoes_clientes ADD COLUMN proximo_vencimento_editavel date;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contratacoes_clientes' AND column_name = 'produto_id') THEN
        ALTER TABLE public.contratacoes_clientes ADD COLUMN produto_id uuid REFERENCES public.produtos(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contratacoes_clientes' AND column_name = 'plano_id') THEN
        ALTER TABLE public.contratacoes_clientes ADD COLUMN plano_id uuid REFERENCES public.planos(id);
    END IF;
END$$;

-- 3. Criar tabela cliente_planos se não existir
CREATE TABLE IF NOT EXISTS public.cliente_planos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.contratacoes_clientes(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  data_contratacao date NOT NULL DEFAULT CURRENT_DATE,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  proximo_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado')),
  valor_pago_centavos integer,
  data_ultimo_pagamento date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(cliente_id, plano_id, data_contratacao)
);

-- 4. Habilitar RLS se não estiver habilitado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_planos') THEN
        ALTER TABLE public.cliente_planos ENABLE ROW LEVEL SECURITY;
        
        -- Políticas RLS
        CREATE POLICY "Admins podem gerenciar cliente_planos"
        ON public.cliente_planos FOR ALL
        USING (is_admin(auth.uid()));

        CREATE POLICY "Clientes podem ver seus próprios planos"
        ON public.cliente_planos FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.contratacoes_clientes 
            WHERE id = cliente_planos.cliente_id 
            AND user_id = auth.uid()
          )
        );
    END IF;
END$$;

-- 5. Criar trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cliente_planos_updated_at') THEN
        CREATE TRIGGER update_cliente_planos_updated_at
        BEFORE UPDATE ON public.cliente_planos
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END$$;

-- 6. Criar função para calcular vencimento
CREATE OR REPLACE FUNCTION public.calcular_vencimento_por_periodicidade(
  p_data_inicio date, 
  p_periodicidade text
) RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_periodicidade
    WHEN 'semanal' THEN
      RETURN p_data_inicio + INTERVAL '7 days';
    WHEN 'mensal' THEN
      RETURN p_data_inicio + INTERVAL '1 month';
    WHEN 'trimestral' THEN
      RETURN p_data_inicio + INTERVAL '3 months';
    WHEN 'semestral' THEN
      RETURN p_data_inicio + INTERVAL '6 months';
    WHEN 'anual' THEN
      RETURN p_data_inicio + INTERVAL '1 year';
    WHEN 'bianual' THEN
      RETURN p_data_inicio + INTERVAL '2 years';
    ELSE
      RETURN p_data_inicio + INTERVAL '1 year';
  END CASE;
END;
$$;