
-- Criar tabela para documentos administrativos
CREATE TABLE public.documentos_admin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT,
  disponivel_por_padrao BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índices para otimizar consultas
CREATE INDEX idx_documentos_admin_tipo ON public.documentos_admin(tipo);
CREATE INDEX idx_documentos_admin_disponivel ON public.documentos_admin(disponivel_por_padrao);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_documentos_admin_updated_at 
  BEFORE UPDATE ON public.documentos_admin 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.documentos_admin ENABLE ROW LEVEL SECURITY;

-- Política para admins poderem gerenciar documentos
CREATE POLICY "Admins can manage documents" ON public.documentos_admin
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Criar bucket para armazenar documentos (se não existir)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage para documentos - admins podem fazer upload
CREATE POLICY "Admins can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política de storage para documentos - todos podem visualizar documentos públicos
CREATE POLICY "Anyone can view documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos');

-- Política de storage para documentos - admins podem atualizar/deletar
CREATE POLICY "Admins can manage documents files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documentos' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
