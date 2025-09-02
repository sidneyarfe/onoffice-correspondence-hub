-- Política RLS para permitir Service Role fazer UPDATE em contratacoes_clientes
-- Isso é necessário para que o n8n possa vincular usuários às contratações
CREATE POLICY "Service role can update contracts" 
ON public.contratacoes_clientes 
FOR UPDATE 
TO service_role 
USING (true)
WITH CHECK (true);

-- Política RLS para permitir Service Role fazer UPDATE em profiles
-- Isso é necessário para que o n8n possa atualizar senhas temporárias
CREATE POLICY "Service role can update profiles" 
ON public.profiles 
FOR UPDATE 
TO service_role 
USING (true)
WITH CHECK (true);