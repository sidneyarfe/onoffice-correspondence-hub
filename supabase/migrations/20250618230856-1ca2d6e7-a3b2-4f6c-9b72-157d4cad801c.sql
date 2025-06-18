
-- Atualizar a função get_user_contratacao_data para remover referências às colunas inexistentes
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
      'role', p.role
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
