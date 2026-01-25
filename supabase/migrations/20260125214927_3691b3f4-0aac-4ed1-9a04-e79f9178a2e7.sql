-- Add calendar_event_id column to store Google Calendar event IDs
ALTER TABLE public.reservas 
ADD COLUMN calendar_event_id text;