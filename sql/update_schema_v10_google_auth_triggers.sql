-- ============================================================================
-- STRATA — Database Update Script v10 (Google OAuth Role Sync Triggers)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ============================================================================

-- Function to handle auto-provisioning of profiles on auth sign up/OAuth sign-in
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  v_role text := 'leader';
  v_name text;
  v_ref_id uuid;
  v_college_id uuid;
BEGIN
  -- 1. Check if email is in public.admins
  SELECT 'admin', name, id INTO v_role, v_name, v_ref_id
    FROM public.admins
   WHERE lower(trim(email)) = lower(trim(NEW.email))
   LIMIT 1;

  -- 2. If not admin, check if email is in public.student_leaders
  IF v_ref_id IS NULL THEN
    SELECT 'leader', name, id, college_id INTO v_role, v_name, v_ref_id, v_college_id
      FROM public.student_leaders
     WHERE lower(trim(email)) = lower(trim(NEW.email))
     LIMIT 1;
  END IF;

  -- 3. If not admin or leader, check if email is in public.incharges
  IF v_ref_id IS NULL THEN
    SELECT 'incharge', name, id INTO v_role, v_name, v_ref_id
      FROM public.incharges
     WHERE lower(trim(email)) = lower(trim(NEW.email))
     LIMIT 1;
  END IF;

  -- 4. If not in any, check if email is in public.accountants
  IF v_ref_id IS NULL THEN
    SELECT 'accountant', name, id INTO v_role, v_name, v_ref_id
      FROM public.accountants
     WHERE lower(trim(email)) = lower(trim(NEW.email))
     LIMIT 1;
  END IF;

  -- If still null, default to leader (name from metadata)
  IF v_ref_id IS NULL THEN
    v_role := 'leader';
    v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  END IF;

  -- Insert/update public profiles
  INSERT INTO public.profiles (id, role, name, ref_id, college_id)
  VALUES (NEW.id, v_role, v_name, v_ref_id, v_college_id)
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      name = EXCLUDED.name,
      ref_id = EXCLUDED.ref_id,
      college_id = EXCLUDED.college_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hook up trigger to auth.users table
DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;
CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
