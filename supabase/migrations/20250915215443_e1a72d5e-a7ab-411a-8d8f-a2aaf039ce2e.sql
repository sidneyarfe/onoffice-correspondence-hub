-- 1. Adicionar periodicidade na tabela planos
ALTER TABLE public.planos 
ADD COLUMN periodicidade text DEFAULT 'anual' 
CHECK (periodicidade IN ('semanal', 'mensal', 'trimestral', 'semestral', 'anual', 'bianual'));

-- 2. Adicionar campos na tabela contratacoes_clientes para controle de datas e pagamentos
ALTER TABLE public.contratacoes_clientes 
ADD COLUMN ultimo_pagamento date,
ADD COLUMN data_encerramento date,
ADD COLUMN proximo_vencimento_editavel date,
ADD COLUMN produto_id uuid REFERENCES public.produtos(id),
ADD COLUMN plano_id uuid REFERENCES public.planos(id);

-- 3. Criar tabela para múltiplos planos por cliente (cliente_planos)
CREATE TABLE public.cliente_planos (
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

-- 4. Habilitar RLS na nova tabela
ALTER TABLE public.cliente_planos ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para cliente_planos
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

-- 6. Trigger para atualizar updated_at
CREATE TRIGGER update_cliente_planos_updated_at
BEFORE UPDATE ON public.cliente_planos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Função para calcular próximo vencimento baseado na periodicidade
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

-- 8. Trigger para calcular próximo vencimento automaticamente quando status = ATIVO
CREATE OR REPLACE FUNCTION public.auto_calcular_vencimento_ativo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plano_periodicidade text;
BEGIN
  -- Só calcular se o status mudou para ATIVO
  IF NEW.status_contratacao = 'ATIVO' AND (OLD.status_contratacao IS NULL OR OLD.status_contratacao != 'ATIVO') THEN
    
    -- Se há plano_id definido, usar a periodicidade do plano
    IF NEW.plano_id IS NOT NULL THEN
      SELECT periodicidade INTO plano_periodicidade 
      FROM public.planos 
      WHERE id = NEW.plano_id;
      
      NEW.proximo_vencimento_editavel = calcular_vencimento_por_periodicidade(
        COALESCE(NEW.created_at::date, CURRENT_DATE), 
        COALESCE(plano_periodicidade, 'anual')
      );
    ELSE
      -- Fallback para plano antigo (plano_selecionado)
      CASE NEW.plano_selecionado
        WHEN '1 MES' THEN
          NEW.proximo_vencimento_editavel = NEW.created_at::date + INTERVAL '1 month';
        WHEN '1 ANO' THEN
          NEW.proximo_vencimento_editavel = NEW.created_at::date + INTERVAL '1 year';
        WHEN '2 ANOS' THEN
          NEW.proximo_vencimento_editavel = NEW.created_at::date + INTERVAL '2 years';
        ELSE
          NEW.proximo_vencimento_editavel = NEW.created_at::date + INTERVAL '1 year';
      END CASE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_calcular_vencimento_ativo
BEFORE UPDATE ON public.contratacoes_clientes
FOR EACH ROW
EXECUTE FUNCTION public.auto_calcular_vencimento_ativo();