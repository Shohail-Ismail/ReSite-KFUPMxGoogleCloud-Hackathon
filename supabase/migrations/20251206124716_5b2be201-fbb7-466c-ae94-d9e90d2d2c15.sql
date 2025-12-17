-- Made by Ram
-- Create table for AI classification events (acts as local BigQuery equivalent)
CREATE TABLE public.material_ai_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id TEXT NOT NULL,
  material_type_user TEXT NOT NULL,
  ai_material_type TEXT NOT NULL,
  ai_confidence FLOAT NOT NULL,
  ai_description TEXT,
  ai_version TEXT NOT NULL,
  embedding FLOAT8[] NULL, -- Store embedding as float array
  image_url TEXT,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI classification quota counter (global limit)
CREATE TABLE public.ai_classification_quota (
  id TEXT PRIMARY KEY DEFAULT 'global',
  count INTEGER NOT NULL DEFAULT 0,
  max_count INTEGER NOT NULL DEFAULT 25,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial quota row
INSERT INTO public.ai_classification_quota (id, count, max_count) 
VALUES ('global', 0, 25);

-- Enable RLS
ALTER TABLE public.material_ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_classification_quota ENABLE ROW LEVEL SECURITY;

-- Public read access for events (for analytics dashboards)
CREATE POLICY "Material AI events are publicly readable" 
ON public.material_ai_events 
FOR SELECT 
USING (true);

-- Service role can insert events (via edge function)
CREATE POLICY "Service can insert material AI events" 
ON public.material_ai_events 
FOR INSERT 
WITH CHECK (true);

-- Public read/update for quota (edge function needs access)
CREATE POLICY "Quota is publicly readable" 
ON public.ai_classification_quota 
FOR SELECT 
USING (true);

CREATE POLICY "Quota can be updated" 
ON public.ai_classification_quota 
FOR UPDATE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_material_ai_events_listing_id ON public.material_ai_events(listing_id);
CREATE INDEX idx_material_ai_events_created_at ON public.material_ai_events(created_at DESC);