-- Fix user_roles RLS: remove restrictive deny policies and recreate permissive policies

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop potentially restrictive/conflicting policies
DROP POLICY IF EXISTS "Only admins can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "No direct role inserts allowed" ON public.user_roles;
DROP POLICY IF EXISTS "No role deletes allowed" ON public.user_roles;
DROP POLICY IF EXISTS "No role updates allowed" ON public.user_roles;

-- Authenticated users can read their own roles (needed for isAdmin check)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage roles (insert/update/delete)
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));