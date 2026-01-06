-- Bloquear INSERT directo en reservas
-- Solo la Edge Function con service role puede crear reservas
CREATE POLICY "No direct inserts - use edge function"
ON public.reservas
FOR INSERT
WITH CHECK (false);