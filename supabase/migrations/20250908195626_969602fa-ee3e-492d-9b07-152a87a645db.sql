-- Função para atualizar senha de admin com bcrypt
CREATE OR REPLACE FUNCTION update_admin_password(p_email TEXT, p_new_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Atualizar senha do admin usando bcrypt
  UPDATE admin_users 
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
    login_attempts = 0,
    locked_until = NULL,
    updated_at = now()
  WHERE email = p_email;
  
  -- Verificar se a atualização foi bem-sucedida
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;