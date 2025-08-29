-- Fix remaining database functions by adding proper search_path security

CREATE OR REPLACE FUNCTION public.generate_random_password()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.calcular_proximo_vencimento(p_data_contratacao date, p_plano text)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  CASE p_plano
    WHEN '1 ANO' THEN
      RETURN p_data_contratacao + INTERVAL '1 year';
    WHEN '6 MESES' THEN
      RETURN p_data_contratacao + INTERVAL '6 months';
    WHEN '1 MES' THEN
      RETURN p_data_contratacao + INTERVAL '1 month';
    ELSE
      RETURN p_data_contratacao + INTERVAL '1 year';
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_admin_system_health()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_context()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Permitir operações quando não há usuário autenticado (contexto admin)
  -- ou quando o usuário autenticado é admin
  RETURN (
    auth.uid() IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_email TEXT;
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Obter o email do usuário
  user_email := auth.email();

  -- Verificar por email específico
  IF user_email IN ('onoffice1893@gmail.com', 'contato@onofficebelem.com.br') THEN
    RETURN true;
  END IF;

  -- Verificar por domínio
  IF user_email LIKE '%@onoffice.com' THEN
    RETURN true;
  END IF;

  -- Verificar por role na tabela profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Esta função pode ser expandida conforme necessário
  -- Por ora, retorna false para prevenir acesso direto via API
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_atividade(p_user_id uuid, p_acao text, p_descricao text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.atividades_cliente (user_id, acao, descricao)
  VALUES (p_user_id, p_acao, p_descricao);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_password_changed(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles 
  SET password_changed = true, 
      temporary_password_hash = NULL,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_temporary_password(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_contratacoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    operation,
    user_id,
    old_data,
    new_data,
    ip_address
  ) VALUES (
    'contratacoes_clientes',
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_ip_address inet, p_email text DEFAULT NULL::text, p_max_submissions integer DEFAULT 5, p_time_window_hours integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    current_count integer;
    time_threshold timestamp with time zone;
BEGIN
    time_threshold := now() - (p_time_window_hours || ' hours')::interval;
    
    -- Clean up old entries
    DELETE FROM public.form_submissions_rate_limit 
    WHERE last_submission_at < time_threshold;
    
    -- Check current rate
    SELECT submission_count INTO current_count
    FROM public.form_submissions_rate_limit
    WHERE ip_address = p_ip_address 
    AND (p_email IS NULL OR email = p_email)
    AND last_submission_at >= time_threshold;
    
    -- If no record exists, create one
    IF current_count IS NULL THEN
        INSERT INTO public.form_submissions_rate_limit (ip_address, email, submission_count)
        VALUES (p_ip_address, p_email, 1);
        RETURN true;
    END IF;
    
    -- Check if rate limit exceeded
    IF current_count >= p_max_submissions THEN
        RETURN false;
    END IF;
    
    -- Update submission count
    UPDATE public.form_submissions_rate_limit 
    SET submission_count = submission_count + 1,
        last_submission_at = now()
    WHERE ip_address = p_ip_address 
    AND (p_email IS NULL OR email = p_email);
    
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_signing_url(p_contratacao_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_signing_url TEXT;
BEGIN
  SELECT zapsign_signing_url INTO v_signing_url
  FROM public.contratacoes_clientes
  WHERE id = p_contratacao_id;

  RETURN v_signing_url;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_email TEXT;
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Obter o email do usuário
  user_email := auth.email();

  -- Verificar por email específico
  IF user_email IN ('onoffice1893@gmail.com', 'contato@onofficebelem.com.br') THEN
    RETURN true;
  END IF;

  -- Verificar por domínio
  IF user_email LIKE '%@onoffice.com' THEN
    RETURN true;
  END IF;

  -- Verificar por role na tabela profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_admin(p_email text, p_password text, p_full_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_cnpj(cnpj_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    cnpj_clean text;
    sum1 integer := 0;
    sum2 integer := 0;
    i integer;
    digit1 integer;
    digit2 integer;
    weights1 integer[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
    weights2 integer[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
BEGIN
    -- Remove non-numeric characters
    cnpj_clean := regexp_replace(cnpj_input, '[^0-9]', '', 'g');
    
    -- Check if CNPJ has 14 digits
    IF length(cnpj_clean) != 14 THEN
        RETURN false;
    END IF;
    
    -- Check for known invalid CNPJs (all same digits)
    IF cnpj_clean IN ('00000000000000', '11111111111111', '22222222222222', '33333333333333', 
                      '44444444444444', '55555555555555', '66666666666666', '77777777777777', 
                      '88888888888888', '99999999999999') THEN
        RETURN false;
    END IF;
    
    -- Calculate first verification digit
    FOR i IN 1..12 LOOP
        sum1 := sum1 + (substring(cnpj_clean, i, 1)::integer * weights1[i]);
    END LOOP;
    
    digit1 := sum1 % 11;
    IF digit1 < 2 THEN
        digit1 := 0;
    ELSE
        digit1 := 11 - digit1;
    END IF;
    
    -- Calculate second verification digit
    FOR i IN 1..13 LOOP
        sum2 := sum2 + (substring(cnpj_clean, i, 1)::integer * weights2[i]);
    END LOOP;
    
    digit2 := sum2 % 11;
    IF digit2 < 2 THEN
        digit2 := 0;
    ELSE
        digit2 := 11 - digit2;
    END IF;
    
    -- Verify digits
    RETURN digit1 = substring(cnpj_clean, 13, 1)::integer AND 
           digit2 = substring(cnpj_clean, 14, 1)::integer;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    cpf_clean text;
    sum1 integer := 0;
    sum2 integer := 0;
    i integer;
    digit1 integer;
    digit2 integer;
BEGIN
    -- Remove non-numeric characters
    cpf_clean := regexp_replace(cpf_input, '[^0-9]', '', 'g');
    
    -- Check if CPF has 11 digits
    IF length(cpf_clean) != 11 THEN
        RETURN false;
    END IF;
    
    -- Check for known invalid CPFs (all same digits)
    IF cpf_clean IN ('00000000000', '11111111111', '22222222222', '33333333333', 
                     '44444444444', '55555555555', '66666666666', '77777777777', 
                     '88888888888', '99999999999') THEN
        RETURN false;
    END IF;
    
    -- Calculate first verification digit
    FOR i IN 1..9 LOOP
        sum1 := sum1 + (substring(cpf_clean, i, 1)::integer * (11 - i));
    END LOOP;
    
    digit1 := 11 - (sum1 % 11);
    IF digit1 >= 10 THEN
        digit1 := 0;
    END IF;
    
    -- Calculate second verification digit
    FOR i IN 1..10 LOOP
        sum2 := sum2 + (substring(cpf_clean, i, 1)::integer * (12 - i));
    END LOOP;
    
    digit2 := 11 - (sum2 % 11);
    IF digit2 >= 10 THEN
        digit2 := 0;
    END IF;
    
    -- Verify digits
    RETURN digit1 = substring(cpf_clean, 10, 1)::integer AND 
           digit2 = substring(cpf_clean, 11, 1)::integer;
END;
$function$;