-- Criar tabela de produtos (categorias de serviços)
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome_produto TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Criar tabela de planos (os planos específicos dentro de cada produto)
CREATE TABLE public.planos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome_plano TEXT NOT NULL,
  descricao TEXT,
  entregaveis JSONB DEFAULT '[]'::jsonb,
  preco_em_centavos INTEGER NOT NULL,
  zapsign_template_id_pf TEXT,
  zapsign_template_id_pj TEXT,
  pagarme_plan_id TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem_exibicao INTEGER DEFAULT 0,
  popular BOOLEAN DEFAULT false
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

-- Políticas para produtos
CREATE POLICY "Admins podem gerenciar produtos" 
ON public.produtos FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Todos podem visualizar produtos ativos" 
ON public.produtos FOR SELECT 
USING (ativo = true);

-- Políticas para planos
CREATE POLICY "Admins podem gerenciar planos" 
ON public.planos FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Todos podem visualizar planos ativos" 
ON public.planos FOR SELECT 
USING (ativo = true AND EXISTS (
  SELECT 1 FROM public.produtos 
  WHERE produtos.id = planos.produto_id AND produtos.ativo = true
));

-- Triggers para updated_at
CREATE TRIGGER update_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planos_updated_at
BEFORE UPDATE ON public.planos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir produto padrão "Endereço Fiscal"
INSERT INTO public.produtos (nome_produto, descricao, ativo) VALUES 
('Endereço Fiscal', 'Serviços de endereço fiscal e recebimento de correspondências', true);

-- Inserir planos atuais como dados iniciais
INSERT INTO public.planos (
  produto_id, 
  nome_plano, 
  descricao, 
  entregaveis, 
  preco_em_centavos, 
  ativo, 
  ordem_exibicao,
  popular
) 
SELECT 
  p.id,
  'Plano Anual',
  'Endereço fiscal completo com todos os benefícios por 12 meses',
  '["Recebimento ilimitado de correspondências", "Digitalização de documentos", "Endereço de prestígio", "Suporte dedicado", "Armazenamento seguro"]'::jsonb,
  99900, -- R$ 999,00
  true,
  1,
  true
FROM public.produtos p WHERE p.nome_produto = 'Endereço Fiscal'
UNION ALL
SELECT 
  p.id,
  'Plano Semestral',
  'Endereço fiscal completo por 6 meses',
  '["Recebimento ilimitado de correspondências", "Digitalização de documentos", "Endereço de prestígio", "Suporte dedicado"]'::jsonb,
  59900, -- R$ 599,00
  true,
  2,
  false
FROM public.produtos p WHERE p.nome_produto = 'Endereço Fiscal'
UNION ALL
SELECT 
  p.id,
  'Plano Mensal',
  'Endereço fiscal mensal renovável',
  '["Recebimento de correspondências", "Digitalização básica", "Endereço comercial"]'::jsonb,
  9900, -- R$ 99,00
  true,
  3,
  false
FROM public.produtos p WHERE p.nome_produto = 'Endereço Fiscal';