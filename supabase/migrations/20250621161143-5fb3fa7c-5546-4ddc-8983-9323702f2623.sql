
-- Tabela para correspondências dos clientes
CREATE TABLE public.correspondencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  remetente TEXT NOT NULL,
  assunto TEXT NOT NULL,
  descricao TEXT,
  data_recebimento DATE NOT NULL DEFAULT CURRENT_DATE,
  visualizada BOOLEAN NOT NULL DEFAULT FALSE,
  arquivo_url TEXT,
  categoria TEXT NOT NULL DEFAULT 'geral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para documentos dos clientes
CREATE TABLE public.documentos_cliente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_documento TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  data_emissao DATE,
  data_atualizacao DATE NOT NULL DEFAULT CURRENT_DATE,
  arquivo_url TEXT,
  tamanho_kb INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para pagamentos
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contratacao_id UUID NOT NULL,
  user_id UUID NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  descricao TEXT NOT NULL,
  numero_fatura TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para atividades dos clientes
CREATE TABLE public.atividades_cliente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_atividade TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Adicionar RLS (Row Level Security) para todas as tabelas
ALTER TABLE public.correspondencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades_cliente ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para correspondências
CREATE POLICY "Users can view their own correspondencias" 
  ON public.correspondencias 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own correspondencias" 
  ON public.correspondencias 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Políticas de segurança para documentos
CREATE POLICY "Users can view their own documentos" 
  ON public.documentos_cliente 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Políticas de segurança para pagamentos
CREATE POLICY "Users can view their own pagamentos" 
  ON public.pagamentos 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Políticas de segurança para atividades
CREATE POLICY "Users can view their own atividades" 
  ON public.atividades_cliente 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own atividades" 
  ON public.atividades_cliente 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_correspondencias_updated_at 
  BEFORE UPDATE ON public.correspondencias 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_documentos_cliente_updated_at 
  BEFORE UPDATE ON public.documentos_cliente 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_pagamentos_updated_at 
  BEFORE UPDATE ON public.pagamentos 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Função para calcular próximo vencimento baseado no plano
CREATE OR REPLACE FUNCTION public.calcular_proximo_vencimento(
  p_data_contratacao DATE,
  p_plano TEXT
) RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_plano
    WHEN '1 ANO' THEN
      RETURN p_data_contratacao + INTERVAL '1 year';
    WHEN '6 MESES' THEN
      RETURN p_data_contratacao + INTERVAL '6 months';
    WHEN '1 MES' THEN
      RETURN p_data_contratacao + INTERVAL '1 month';
    ELSE
      RETURN p_data_contratacao + INTERVAL '1 year';
  END CASE;
END;
$$;

-- Função para registrar atividade do usuário
CREATE OR REPLACE FUNCTION public.registrar_atividade(
  p_user_id UUID,
  p_acao TEXT,
  p_descricao TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.atividades_cliente (user_id, acao, descricao)
  VALUES (p_user_id, p_acao, p_descricao);
END;
$$;
