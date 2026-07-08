-- ============================================================================
-- STRATA — Database Update Script v12 (Configure Leader Profile RPC)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ============================================================================

-- SECURITY DEFINER RPC to configure a leader profile securely bypassing RLS
CREATE OR REPLACE FUNCTION public.configure_leader_profile(
  p_user_id      uuid,
  p_leader_name  text,
  p_leader_phone text,
  p_leader_dept  text,
  p_college_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_college_id uuid;
  v_leader_id uuid;
  v_email text;
BEGIN
  -- Fetch verified email of the authenticated user to prevent spoofing
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found in authentication catalog.';
  END IF;

  -- 1. Find or create college
  SELECT id INTO v_college_id
    FROM public.colleges
   WHERE lower(trim(college)) = lower(trim(p_college_name))
   LIMIT 1;

  IF v_college_id IS NULL THEN
    INSERT INTO public.colleges (college, department, status)
    VALUES (p_college_name, p_leader_dept, 'active')
    RETURNING id INTO v_college_id;
  END IF;

  -- 2. Create student leader row
  INSERT INTO public.student_leaders (name, phone, email, department, college_id, status)
  VALUES (
    p_leader_name,
    p_leader_phone,
    v_email,
    p_leader_dept,
    v_college_id,
    'active'
  )
  RETURNING id INTO v_leader_id;

  -- 3. Link profiles table
  UPDATE public.profiles
     SET ref_id = v_leader_id,
         college_id = v_college_id,
         name = p_leader_name
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'college_id', v_college_id,
    'leader_id', v_leader_id
  );
END;
$$;
