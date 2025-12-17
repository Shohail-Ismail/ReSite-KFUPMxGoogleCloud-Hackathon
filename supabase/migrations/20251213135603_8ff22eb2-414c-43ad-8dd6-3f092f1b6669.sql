-- Made by Ram
-- Remove public read access from material_ai_events table
-- This table is for analytics and should only be accessed by edge functions (service role)
-- Not certain on RL (?) system - TODO to review later with team
DROP POLICY IF EXISTS "Authenticated users can read material AI events" ON public.material_ai_events;