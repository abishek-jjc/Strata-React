-- ============================================================================
-- STRATA — Clear / Reset Transactional Data Script
-- Run this in the Supabase SQL editor (https://supabase.com) to reset the
-- application state after registration/contests, keeping college accounts,
-- student leaders, incharges, and auth profiles intact.
-- ============================================================================

-- Disable constraints temporarily to prevent trigger/referential issues
SET session_replication_role = 'replica';

-- 1. Truncate transactional, participant, leader, and results tables
TRUNCATE TABLE public.certificates CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.students CASCADE;
TRUNCATE TABLE public.registrations CASCADE;
TRUNCATE TABLE public.winners CASCADE;
TRUNCATE TABLE public.payment_logs CASCADE;
TRUNCATE TABLE public.payment_polls CASCADE;
TRUNCATE TABLE public.student_leaders CASCADE;
TRUNCATE TABLE public.leaders CASCADE;

-- 2. Reset college payment statuses
UPDATE public.colleges
   SET is_paid = false,
       paid_student_count = 0,
       payment_screenshot = NULL;

-- 3. Reset lots to unassigned state
UPDATE public.lots
   SET is_assigned = false,
       assigned_college = '-';

-- Re-enable constraints
SET session_replication_role = 'origin';
