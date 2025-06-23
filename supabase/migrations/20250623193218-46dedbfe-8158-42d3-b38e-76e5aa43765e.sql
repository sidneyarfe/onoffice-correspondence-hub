
-- Habilitar Row Level Security na tabela admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Criar política para que apenas admins possam ver outros admins
-- (Normalmente esta tabela não deveria ser acessível via API, mas por segurança)
CREATE POLICY "Only system can access admin_users" 
ON public.admin_users 
FOR ALL 
USING (false);

-- Criar função de segurança para operações administrativas se necessário
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Esta função pode ser expandida conforme necessário
  -- Por ora, retorna false para prevenir acesso direto via API
  RETURN false;
END;
$$;
