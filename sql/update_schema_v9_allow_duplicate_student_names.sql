-- ============================================================================
-- STRATA — Database Update Script v9 (Allow duplicate student names across colleges)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ============================================================================

-- Drop the unique constraint on student_name_normalized if it exists
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_student_name_normalized_key;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_student_name_normalized_unique;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS student_name_normalized_unique;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_student_name_normalized_idx;

-- Re-define register_team RPC function with simplified error message
CREATE OR REPLACE FUNCTION public.register_team(
  p_college_id   uuid,
  p_leader_id    uuid,
  p_event_id     uuid,
  p_participants jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_min   int;
  v_max   int;
  v_count int;
  v_reg_id      uuid;
  v_participant jsonb;
  v_names       text[];
BEGIN
  SELECT minimum_participants, maximum_participants
    INTO v_min, v_max
    FROM public.events WHERE id = p_event_id;

  IF v_min IS NULL THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  v_count := jsonb_array_length(p_participants);
  IF v_count < v_min THEN
    RAISE EXCEPTION 'Needs at least % participants — currently %.', v_min, v_count;
  END IF;
  IF v_count > v_max THEN
    RAISE EXCEPTION 'Maximum % participants allowed — currently %.', v_max, v_count;
  END IF;

  -- Verify duplicate names *within the same team* only
  SELECT array_agg(lower(trim(elem->>'studentName')))
    INTO v_names
    FROM jsonb_array_elements(p_participants) elem;

  IF array_length(v_names, 1) <> (SELECT count(distinct x) FROM unnest(v_names) x) THEN
    RAISE EXCEPTION 'Two participants in this team have the same name.';
  END IF;

  INSERT INTO public.registrations (college_id, leader_id, event_id, status)
  VALUES (p_college_id, p_leader_id, p_event_id, 'pending')
  RETURNING id INTO v_reg_id;

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants) LOOP
    INSERT INTO public.students (
      student_name, student_name_normalized, gender, department, year, email,
      registration_id, leader_id, college_id, event_id, certificate_status
    ) VALUES (
      v_participant->>'studentName',
      lower(trim(v_participant->>'studentName')),
      v_participant->>'gender',
      v_participant->>'department',
      v_participant->>'year',
      v_participant->>'email',
      v_reg_id, p_leader_id, p_college_id, p_event_id, 'not issued'
    );
  END LOOP;

  RETURN v_reg_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This college has already registered for this event.';
END;
$$;
