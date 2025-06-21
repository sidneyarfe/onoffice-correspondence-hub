
-- Criar tabela para controlar disponibilidade de documentos por cliente
CREATE TABLE public.documentos_disponibilidade (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  documento_tipo TEXT NOT NULL,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, documento_tipo)
);

-- Adicionar RLS
ALTER TABLE public.documentos_disponibilidade ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios documentos
CREATE POLICY "Users can view their own document availability" 
  ON public.documentos_disponibilidade 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para admins gerenciarem todos os documentos
CREATE POLICY "Admins can manage all document availability" 
  ON public.documentos_disponibilidade 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_documentos_disponibilidade_updated_at
  BEFORE UPDATE ON public.documentos_disponibilidade
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para notificações do sistema
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  lida BOOLEAN NOT NULL DEFAULT false,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_leitura TIMESTAMP WITH TIME ZONE NULL
);

-- Adicionar RLS para notificações
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas notificações
CREATE POLICY "Users can view their own notifications" 
  ON public.notificacoes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para usuários atualizarem suas notificações (marcar como lida)
CREATE POLICY "Users can update their own notifications" 
  ON public.notificacoes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política para admins criarem notificações
CREATE POLICY "Admins can create notifications" 
  ON public.notificacoes 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
