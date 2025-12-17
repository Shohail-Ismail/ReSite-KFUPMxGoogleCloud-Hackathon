-- Made by Ram
-- Fix overly permissive RLS policies on analytics tables

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Quota can be updated" ON public.ai_classification_quota;
DROP POLICY IF EXISTS "Quota is publicly readable" ON public.ai_classification_quota;
DROP POLICY IF EXISTS "Material AI events are publicly readable" ON public.material_ai_events;
DROP POLICY IF EXISTS "Service can insert material AI events" ON public.material_ai_events;

-- Create restrictive policies for ai_classification_quota
-- Only authenticated users can read quota (for display purposes)
CREATE POLICY "Authenticated users can read quota"
ON public.ai_classification_quota
FOR SELECT
TO authenticated
USING (true);

-- Create restrictive policies for material_ai_events
-- Only authenticated users can read events
CREATE POLICY "Authenticated users can read material AI events"
ON public.material_ai_events
FOR SELECT
TO authenticated
USING (true);