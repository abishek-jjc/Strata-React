-- ========================================================================
-- STRATA — Database Update Script v3 (Split Venues)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ========================================================================

-- 1. Add prelims_venue and mains_venue columns to events table referencing venues(id)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS prelims_venue uuid REFERENCES public.venues(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mains_venue uuid REFERENCES public.venues(id) ON DELETE SET NULL;

-- 2. Migrate existing venue data to both columns so that no data is lost
UPDATE public.events SET prelims_venue = venue, mains_venue = venue WHERE venue IS NOT NULL;

-- 3. Drop the single venue column
ALTER TABLE public.events DROP COLUMN IF EXISTS venue;
