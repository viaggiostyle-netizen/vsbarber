-- 1. Agregar políticas restrictivas para user_roles (INSERT, UPDATE, DELETE)
-- Solo el trigger del sistema puede insertar roles, no usuarios directamente

-- Política que BLOQUEA cualquier INSERT directo (los roles se asignan via trigger)
CREATE POLICY "No direct role inserts allowed"
ON public.user_roles
FOR INSERT
WITH CHECK (false);

-- Política que BLOQUEA cualquier UPDATE directo
CREATE POLICY "No role updates allowed"
ON public.user_roles
FOR UPDATE
USING (false);

-- Política que BLOQUEA cualquier DELETE directo
CREATE POLICY "No role deletes allowed"
ON public.user_roles
FOR DELETE
USING (false);