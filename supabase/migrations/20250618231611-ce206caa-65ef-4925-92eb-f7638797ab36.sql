
-- Adicionar colunas para gerenciar senhas temporárias na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN temporary_password_hash TEXT,
ADD COLUMN password_changed BOOLEAN DEFAULT false;

-- Atualizar a função get_user_contratacao_data para incluir os novos campos
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
      'role', p.role,
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

-- Função para validar senha temporária
CREATE OR REPLACE FUNCTION public.validate_temporary_password(p_user_id UUID, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT temporary_password_hash INTO stored_hash
  FROM public.profiles
  WHERE id = p_user_id AND password_changed = false;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Usar crypt para validar a senha hasheada
  RETURN crypt(p_password, stored_hash) = stored_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar senha como alterada
CREATE OR REPLACE FUNCTION public.mark_password_changed(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET password_changed = true, 
      temporary_password_hash = NULL,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
