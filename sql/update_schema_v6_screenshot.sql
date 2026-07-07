-- ========================================================================
-- STRATA — Database Update Script v6 (Payment Screenshot / Receipts)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ========================================================================

ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS payment_screenshot text;
