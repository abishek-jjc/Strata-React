-- ============================================================================
-- STRATA 2K26 — Update Leader Profile RPC Function
-- Run this in your Supabase SQL Editor: https://supabase.com
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_leader_profile_data(
  p_name text,
  p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ref_id uuid;
BEGIN
  -- Get the current authenticated user's ref_id (which points to student_leaders.id)
  SELECT ref_id INTO v_ref_id
    FROM public.profiles
   WHERE id = auth.uid();

  IF v_ref_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is not registered as a student leader.';
  END IF;

  -- Update student_leaders table details
  -- The trigger public.sync_profile_on_leader_change() will automatically
  -- sync this change to the public.profiles table.
  UPDATE public.student_leaders
     SET name = p_name,
         phone = p_phone
   WHERE id = v_ref_id;
END;
$$;
