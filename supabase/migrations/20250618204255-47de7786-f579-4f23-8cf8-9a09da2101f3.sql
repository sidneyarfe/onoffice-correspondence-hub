
-- Criar tabela de profiles para dados adicionais dos usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  temporary_password TEXT, -- Para armazenar senha temporária se necessário
  password_changed BOOLEAN DEFAULT false
);

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para usuários atualizarem apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Adicionar coluna user_id na tabela contratacoes_clientes para vincular ao usuário
ALTER TABLE public.contratacoes_clientes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Função para criar perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para gerar senha aleatória segura
CREATE OR REPLACE FUNCTION public.generate_random_password()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para o n8n consultar dados do usuário (com SECURITY DEFINER para permitir acesso admin)
CREATE OR REPLACE FUNCTION public.get_user_contratacao_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  user_data JSON;
BEGIN
  SELECT json_build_object(
    'user_info', json_build_object(
      'id', u.id,
      'email', u.email,
      'created_at', u.created_at
    ),
    'profile', json_build_object(
      'full_name', p.full_name,
      'temporary_password', p.temporary_password,
      'password_changed', p.password_changed
    ),
    'contratacao', json_build_object(
      'id', c.id,
      'plano_selecionado', c.plano_selecionado,
      'tipo_pessoa', c.tipo_pessoa,
      'nome_responsavel', c.nome_responsavel,
      'email', c.email,
      'telefone', c.telefone,
      'status_contratacao', c.status_contratacao,
      'created_at', c.created_at
    )
  ) INTO user_data
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  LEFT JOIN public.contratacoes_clientes c ON u.id = c.user_id
  WHERE u.id = p_user_id;
  
  RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
