-- ========================================================================
-- STRATA — Database Update Script v4 (Leader Constraint)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ========================================================================

-- Enforce that there is only one leader per college
ALTER TABLE public.student_leaders ADD CONSTRAINT student_leaders_college_id_key UNIQUE (college_id);
