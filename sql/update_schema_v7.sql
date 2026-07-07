-- ========================================================================
-- STRATA — Database Update Script v7 (Winners Validation Constraint)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ========================================================================

-- Clean up any existing data where first_place and second_place are equal and not '-'
UPDATE public.winners
   SET second_place = '-'
 WHERE first_place = second_place AND first_place <> '-';

-- Add check constraint to ensure first_place and second_place are not equal unless they are '-'
ALTER TABLE public.winners DROP CONSTRAINT IF EXISTS winners_different_places;
ALTER TABLE public.winners ADD CONSTRAINT winners_different_places
  CHECK (
    (first_place = '-' AND second_place = '-') OR
    (first_place <> second_place)
  );
