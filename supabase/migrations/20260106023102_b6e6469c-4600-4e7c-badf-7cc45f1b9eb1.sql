-- Eliminar la política de INSERT pública en reservas
-- Ahora las reservas se crean solo a través de la Edge Function con service role
DROP POLICY IF EXISTS "Anyone can create reservas" ON public.reservas;