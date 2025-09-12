-- Criar tabela para categorias de correspondências personalizáveis
CREATE TABLE public.categorias_correspondencia (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  descricao text,
  cor text DEFAULT 'gray',
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.categorias_correspondencia ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all categories" 
ON public.categorias_correspondencia 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "All can view categories" 
ON public.categorias_correspondencia 
FOR SELECT 
USING (true);

-- Inserir categorias padrão do sistema
INSERT INTO public.categorias_correspondencia (nome, descricao, cor, is_system) VALUES
('fiscal', 'Correspondências fiscais', 'red', true),
('municipal', 'Correspondências municipais', 'blue', true),
('estadual', 'Correspondências estaduais', 'green', true),
('bancario', 'Correspondências bancárias', 'purple', true),
('trabalhista', 'Correspondências trabalhistas', 'orange', true),
('geral', 'Correspondências gerais', 'gray', true);

-- Trigger para updated_at
CREATE TRIGGER update_categorias_correspondencia_updated_at
  BEFORE UPDATE ON public.categorias_correspondencia
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();