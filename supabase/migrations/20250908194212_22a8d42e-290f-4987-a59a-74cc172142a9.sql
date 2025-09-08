-- Desbloquear a conta admin e atualizar com a nova senha
UPDATE admin_users 
SET 
  login_attempts = 0,
  locked_until = NULL,
  password_hash = crypt('@GBservice2085', gen_salt('bf')),
  updated_at = now()
WHERE email = 'onoffice1893@gmail.com';