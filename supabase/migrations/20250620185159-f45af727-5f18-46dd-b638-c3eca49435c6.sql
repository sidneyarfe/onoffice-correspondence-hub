
-- Criar nova função que busca dados do usuário a partir do ID da contratação
CREATE OR REPLACE FUNCTION public.get_user_data_from_contratacao(p_contratacao_id UUID)
RETURNS JSON AS $$
DECLARE
  user_data JSON;
  v_user_id UUID;
BEGIN
  -- Passo 1: Encontrar o user_id a partir do id da contratação
  SELECT user_id INTO v_user_id
  FROM public.contratacoes_clientes
  WHERE id = p_contratacao_id;

  -- Passo 2: Se um user_id foi encontrado, buscar todos os dados relacionados
  IF v_user_id IS NOT NULL THEN
    SELECT json_build_object(
      'user_info', json_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at
      ),
      'profile', json_build_object(
        'full_name', p.full_name,
        'role', p.role,
        'password_changed', p.password_changed,
        'temporary_password', CASE 
          WHEN p.password_changed = false THEN p.temporary_password_plain 
          ELSE NULL 
        END
      ),
      'contratacao', json_build_object(
        'id', c.id,
        'plano_selecionado', c.plano_selecionado,
        'tipo_pessoa', c.tipo_pessoa,
        'nome_responsavel', c.nome_responsavel,
        'email', c.email,
        'telefone', c.telefone,
        'status_contratacao', c.status_contratacao,
        'created_at', c.created_at,
        'user_id', c.user_id
      )
    ) INTO user_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.contratacoes_clientes c ON u.id = c.user_id
    WHERE u.id = v_user_id;
  ELSE
    RETURN json_build_object('error', 'Contratação não encontrada ou usuário não vinculado');
  END IF;
    
  RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
