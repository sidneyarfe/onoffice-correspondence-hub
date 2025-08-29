-- Create secure temporary password functions
CREATE OR REPLACE FUNCTION public.create_temporary_password_hash(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use proper bcrypt hashing instead of Base64
  UPDATE public.profiles 
  SET temporary_password_hash = public.hash_password(p_password),
      password_changed = false,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Update the temporary password validation function to use bcrypt
CREATE OR REPLACE FUNCTION public.validate_temporary_password(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT temporary_password_hash INTO stored_hash
  FROM public.profiles
  WHERE id = p_user_id AND (password_changed = false OR password_changed IS NULL);
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Use bcrypt verification instead of simple comparison
  RETURN public.verify_password(p_password, stored_hash);
END;
$$;

-- Add input validation function
CREATE OR REPLACE FUNCTION public.validate_email_format(email_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Basic email validation regex
  RETURN email_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Add password strength validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_input text)
RETURNS json
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  issues text[] := '{}';
BEGIN
  -- Check minimum length
  IF length(password_input) < 8 THEN
    issues := array_append(issues, 'Password must be at least 8 characters long');
  END IF;
  
  -- Check for uppercase letter
  IF password_input !~ '[A-Z]' THEN
    issues := array_append(issues, 'Password must contain at least one uppercase letter');
  END IF;
  
  -- Check for lowercase letter
  IF password_input !~ '[a-z]' THEN
    issues := array_append(issues, 'Password must contain at least one lowercase letter');
  END IF;
  
  -- Check for number
  IF password_input !~ '[0-9]' THEN
    issues := array_append(issues, 'Password must contain at least one number');
  END IF;
  
  -- Check for special character
  IF password_input !~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>?]' THEN
    issues := array_append(issues, 'Password must contain at least one special character');
  END IF;
  
  RETURN json_build_object(
    'is_valid', array_length(issues, 1) IS NULL,
    'issues', issues
  );
END;
$$;