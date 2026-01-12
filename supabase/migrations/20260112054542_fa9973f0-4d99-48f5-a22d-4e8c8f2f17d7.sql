-- Clean up conflicting/legacy RLS policies to ensure intended behavior

-- reservas
DROP POLICY IF EXISTS "No direct inserts - use edge function" ON public.reservas;
DROP POLICY IF EXISTS "Only admins can view full reservas data" ON public.reservas;
DROP POLICY IF EXISTS "Only admins can view reservas" ON public.reservas;
DROP POLICY IF EXISTS "Only admins can delete reservas" ON public.reservas;

-- keep: Public can create reservas / Admins can read/update/delete reservas

-- blocked_hours
DROP POLICY IF EXISTS "Authenticated can view blocked hours" ON public.blocked_hours;
DROP POLICY IF EXISTS "Admins can insert blocked hours" ON public.blocked_hours;
DROP POLICY IF EXISTS "Admins can delete blocked hours" ON public.blocked_hours;

-- keep: Admins manage blocked_hours
