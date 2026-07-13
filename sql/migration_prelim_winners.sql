-- ============================================================================
-- STRATA 2K26 Migration: Preliminary Winners and Publishing Statuses
-- Run this in your Supabase SQL Editor: https://supabase.com
-- ============================================================================

ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS prelim_winners text[] DEFAULT '{}';
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS prelims_published boolean DEFAULT false;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS mains_published boolean DEFAULT false;
