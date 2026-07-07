-- ========================================================================
-- STRATA — Database Update Script v5 (Lots Limit)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ========================================================================

CREATE OR REPLACE FUNCTION register_guest_team(
  p_leader_name text,
  p_email text,
  p_phone text,
  p_department text,
  p_college_name text,
  p_college_dept text,
  p_college_phone text,
  p_college_email text,
  p_college_address text,
  p_veg_count int,
  p_nonveg_count int,
  p_registrations jsonb
) RETURNS TABLE (out_leader_id uuid, out_college_id uuid)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_college_id uuid;
  v_leader_id uuid;
  v_reg_item jsonb;
  v_event_id uuid;
  v_participants jsonb;
  v_reg_id uuid;
  v_lot_id uuid;
  v_lot_name text;
BEGIN
  -- Find or create college (using renamed column 'college')
  SELECT id INTO v_college_id FROM colleges WHERE lower(trim(college)) = lower(trim(p_college_name)) LIMIT 1;
  IF v_college_id IS NULL THEN
    INSERT INTO colleges (college, department, phone, email, address, status)
    VALUES (p_college_name, p_college_dept, p_college_phone, p_college_email, p_college_address, 'active')
    RETURNING id INTO v_college_id;
  END IF;

  -- Find or create student leader
  SELECT id INTO v_leader_id FROM student_leaders WHERE lower(trim(email)) = lower(trim(p_email)) AND college_id = v_college_id LIMIT 1;
  IF v_leader_id IS NULL THEN
    INSERT INTO student_leaders (name, phone, email, department, college_id, status)
    VALUES (p_leader_name, p_phone, p_email, p_department, v_college_id, 'active')
    RETURNING id INTO v_leader_id;
  END IF;

  -- Check if the college already has a lot assigned
  SELECT id, lot_name INTO v_lot_id, v_lot_name FROM lots WHERE lower(trim(assigned_college)) = lower(trim(p_college_name)) LIMIT 1;

  -- If not found, find the first unallocated lot (where is_assigned is false)
  IF v_lot_id IS NULL THEN
    SELECT id, lot_name INTO v_lot_id, v_lot_name FROM lots WHERE is_assigned = false ORDER BY lot_name ASC LIMIT 1;

    -- If found, assign this lot to the college name
    IF v_lot_id IS NOT NULL THEN
      UPDATE lots 
         SET is_assigned = true, 
             assigned_college = p_college_name 
       WHERE id = v_lot_id;
    END IF;
  END IF;

  -- Register team for each event
  FOR v_reg_item IN SELECT * FROM jsonb_array_elements(p_registrations)
  LOOP
    v_event_id := (v_reg_item->>'eventId')::uuid;
    v_participants := v_reg_item->'participants';

    -- Call standard register_team function
    v_reg_id := register_team(v_college_id, v_leader_id, v_event_id, v_participants);

    -- Set food counts on the registrations row and set status to lot_assigned if lot was allocated
    UPDATE registrations 
       SET veg_count = p_veg_count, 
           nonveg_count = p_nonveg_count,
           status = CASE WHEN v_lot_id IS NOT NULL THEN 'lot_assigned' else 'pending' END
     WHERE id = v_reg_id;
  END LOOP;

  out_leader_id := v_leader_id;
  out_college_id := v_college_id;
  RETURN NEXT;
END;
$$;
