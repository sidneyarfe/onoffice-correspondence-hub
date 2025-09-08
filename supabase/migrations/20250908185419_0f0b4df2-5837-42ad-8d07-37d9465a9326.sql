-- Inserir usuário admin Sidney Ferreira
INSERT INTO public.admin_users (email, password_hash, full_name, is_active)
VALUES (
  'sidneyferreira12205@gmail.com', 
  hash_password('OnOffice2025!'), 
  'Sidney Ferreira Admin',
  true
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  is_active = true,
  login_attempts = 0,
  locked_until = NULL,
  updated_at = now();