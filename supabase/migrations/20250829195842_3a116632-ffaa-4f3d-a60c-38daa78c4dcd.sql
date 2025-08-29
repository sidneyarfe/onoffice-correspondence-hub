-- CRITICAL SECURITY FIX: Remove public access to sensitive customer data

-- Remove dangerous public access policies from contratacoes_clientes
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.contratacoes_clientes;
DROP POLICY IF EXISTS "Allow public form submissions" ON public.contratacoes_clientes;

-- Remove dangerous public access policies from correspondencias  
DROP POLICY IF EXISTS "Allow authenticated and unauthenticated view correspondences" ON public.correspondencias;
DROP POLICY IF EXISTS "Allow authenticated and unauthenticated insert correspondences" ON public.correspondencias;
DROP POLICY IF EXISTS "Allow authenticated and unauthenticated update correspondences" ON public.correspondencias;
DROP POLICY IF EXISTS "Allow authenticated and unauthenticated delete correspondences" ON public.correspondencias;

-- Ensure only secure, user-specific access to contratacoes_clientes
CREATE POLICY "Users can view own contracts only" 
ON public.contratacoes_clientes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contracts" 
ON public.contratacoes_clientes 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Form submissions allowed for signup" 
ON public.contratacoes_clientes 
FOR INSERT 
WITH CHECK (user_id IS NULL); -- Only for initial signup before user creation

CREATE POLICY "Users can update own contracts" 
ON public.contratacoes_clientes 
FOR UPDATE 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can delete contracts" 
ON public.contratacoes_clientes 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Secure correspondencias table - users only see their own data
CREATE POLICY "Users can view own correspondences only" 
ON public.correspondencias 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own correspondences only" 
ON public.correspondencias 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all correspondences" 
ON public.correspondencias 
FOR ALL 
USING (is_admin(auth.uid()));

-- Remove plain text password storage from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS temporary_password_plain;

-- Update database functions to be more secure
CREATE OR REPLACE FUNCTION public.authenticate_admin(p_email text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  
  -- Use secure password verification instead of hardcoded passwords
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
$function$;

-- Secure other functions
CREATE OR REPLACE FUNCTION public.get_user_contratacao_data(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;