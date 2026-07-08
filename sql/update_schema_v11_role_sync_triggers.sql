-- ============================================================================
-- STRATA — Database Update Script v11 (Real-time Profile Role Sync Triggers)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ============================================================================

-- 1. Sync profile when a row in public.admins is created or updated
CREATE OR REPLACE FUNCTION public.sync_profile_on_admin_change()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
     SET role = 'admin',
         ref_id = NEW.id,
         college_id = NULL
   WHERE id IN (
     SELECT id FROM auth.users WHERE lower(trim(email)) = lower(trim(NEW.email))
   );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_on_admin_change ON public.admins;
CREATE TRIGGER trg_sync_profile_on_admin_change
  AFTER INSERT OR UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_on_admin_change();


-- 2. Sync profile when a row in public.student_leaders is created or updated
CREATE OR REPLACE FUNCTION public.sync_profile_on_leader_change()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
     SET role = 'leader',
         ref_id = NEW.id,
         college_id = NEW.college_id
   WHERE id IN (
     SELECT id FROM auth.users WHERE lower(trim(email)) = lower(trim(NEW.email))
   );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_on_leader_change ON public.student_leaders;
CREATE TRIGGER trg_sync_profile_on_leader_change
  AFTER INSERT OR UPDATE ON public.student_leaders
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_on_leader_change();
