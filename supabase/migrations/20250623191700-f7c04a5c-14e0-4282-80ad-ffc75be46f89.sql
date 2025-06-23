
-- Criar tabela específica para admins independente do sistema de auth
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);

-- Função para criar hash de senha
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

-- Função para verificar senha
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$;

-- Função para autenticar admin
CREATE OR REPLACE FUNCTION public.authenticate_admin(p_email TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record RECORD;
  result JSON;
BEGIN
  -- Buscar admin por email
  SELECT * INTO admin_record
  FROM public.admin_users
  WHERE email = p_email AND is_active = true;
  
  -- Verificar se admin existe
  IF admin_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin não encontrado');
  END IF;
  
  -- Verificar se conta está bloqueada
  IF admin_record.locked_until IS NOT NULL AND admin_record.locked_until > now() THEN
    RETURN json_build_object('success', false, 'error', 'Conta temporariamente bloqueada');
  END IF;
  
  -- Verificar senha
  IF NOT verify_password(p_password, admin_record.password_hash) THEN
    -- Incrementar tentativas de login
    UPDATE public.admin_users
    SET login_attempts = login_attempts + 1,
        locked_until = CASE 
          WHEN login_attempts >= 4 THEN now() + INTERVAL '15 minutes'
          ELSE NULL
        END
    WHERE id = admin_record.id;
    
    RETURN json_build_object('success', false, 'error', 'Senha incorreta');
  END IF;
  
  -- Login bem-sucedido - resetar tentativas e atualizar último login
  UPDATE public.admin_users
  SET login_attempts = 0,
      locked_until = NULL,
      last_login_at = now()
  WHERE id = admin_record.id;
  
  -- Retornar dados do admin
  RETURN json_build_object(
    'success', true,
    'admin', json_build_object(
      'id', admin_record.id,
      'email', admin_record.email,
      'full_name', admin_record.full_name,
      'created_at', admin_record.created_at
    )
  );
END;
$$;

-- Função para criar ou atualizar admin
CREATE OR REPLACE FUNCTION public.upsert_admin(p_email TEXT, p_password TEXT, p_full_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id UUID;
  password_hash TEXT;
BEGIN
  -- Gerar hash da senha
  password_hash := hash_password(p_password);
  
  -- Inserir ou atualizar admin
  INSERT INTO public.admin_users (email, password_hash, full_name)
  VALUES (p_email, password_hash, p_full_name)
  ON CONFLICT (email) 
  DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true,
    login_attempts = 0,
    locked_until = NULL,
    updated_at = now()
  RETURNING id INTO admin_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Admin criado/atualizado com sucesso',
    'admin_id', admin_id
  );
END;
$$;

-- Função para verificar saúde do sistema admin
CREATE OR REPLACE FUNCTION public.check_admin_system_health()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  admin_count INTEGER;
  active_admins INTEGER;
  result JSON;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.admin_users;
  SELECT COUNT(*) INTO active_admins FROM public.admin_users WHERE is_active = true;
  
  RETURN json_build_object(
    'total_admins', admin_count,
    'active_admins', active_admins,
    'system_healthy', active_admins > 0,
    'checked_at', now()
  );
END;
$$;

-- Inserir os dois admins principais
SELECT public.upsert_admin('onoffice1893@gmail.com', '@GBservice2085', 'Admin OnOffice Principal');
SELECT public.upsert_admin('contato@onofficebelem.com.br', '123456', 'Admin OnOffice Belém');

-- Verificar se os admins foram criados
SELECT 
  email,
  full_name,
  is_active,
  created_at,
  'Admin criado com sucesso' as status
FROM public.admin_users
ORDER BY created_at;

-- Verificar saúde do sistema
SELECT public.check_admin_system_health();
