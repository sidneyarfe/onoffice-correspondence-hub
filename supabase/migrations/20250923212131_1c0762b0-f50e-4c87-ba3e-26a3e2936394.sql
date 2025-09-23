-- Remove the restrictive policy that blocks everything
DROP POLICY IF EXISTS "Only system can access admin_users" ON public.admin_users;

-- Create new RLS policies for admin_users table
CREATE POLICY "Admins can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can update admin users" 
ON public.admin_users 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can insert admin users" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (public.is_admin());

-- Keep DELETE restricted for now (can be enabled later if needed)
-- CREATE POLICY "Admins can delete admin users" 
-- ON public.admin_users 
-- FOR DELETE 
-- USING (public.is_admin());