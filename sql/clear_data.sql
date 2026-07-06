-- ========================================================================
-- STRATA — Clear / Reset Data Script
-- Run this in the Supabase SQL editor to delete all data while keeping the schema.
-- ========================================================================

-- Disable constraints temporarily to prevent trigger/referential issues during truncation
set session_replication_role = 'replica';

-- 1. Truncate all public schema tables
truncate table public.certificates cascade;
truncate table public.payments cascade;
truncate table public.students cascade;
truncate table public.registrations cascade;
truncate table public.lots cascade;
truncate table public.incharges cascade;
truncate table public.accountants cascade;
truncate table public.student_leaders cascade;
truncate table public.colleges cascade;
truncate table public.events cascade;
truncate table public.admins cascade;
truncate table public.profiles cascade;

-- 2. Clear all auth schema tables
delete from auth.identities;
delete from auth.users;

-- Re-enable constraints
set session_replication_role = 'origin';
