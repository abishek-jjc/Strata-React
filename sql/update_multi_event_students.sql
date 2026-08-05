-- Migration Script: Multi-Event Participant Linking without Duplicates & Cleanup

-- 1. Add event_ids array column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS event_ids uuid[] DEFAULT ARRAY[]::uuid[];

-- 2. Backfill event_ids for existing student records
UPDATE public.students 
   SET event_ids = ARRAY[event_id] 
 WHERE (event_ids IS NULL OR array_length(event_ids, 1) IS NULL OR array_length(event_ids, 1) = 0)
   AND event_id IS NOT NULL;

-- 3. AUTOMATED DATABASE CLEANUP: Merge existing duplicate student records into single records per physical student
DO $$
DECLARE
  r RECORD;
  v_master_id uuid;
  v_dup_ids uuid[];
  v_combined_event_ids uuid[];
  v_has_nonveg boolean;
BEGIN
  -- 3a. Clean up duplicates by college_id + roll_no
  FOR r IN 
    SELECT college_id, lower(trim(roll_no)) AS clean_roll, ARRAY_AGG(id ORDER BY created_at ASC) AS ids
      FROM public.students
     WHERE roll_no IS NOT NULL AND trim(roll_no) <> '' AND trim(roll_no) <> '-'
     GROUP BY college_id, lower(trim(roll_no))
    HAVING COUNT(*) > 1
  LOOP
    v_master_id := r.ids[1]; -- Keep primary record
    v_dup_ids := r.ids[2:array_length(r.ids, 1)]; -- Duplicate record IDs

    -- Aggregate all event_ids from primary and duplicate records
    SELECT ARRAY_AGG(DISTINCT ev_id),
           LOGICAL_OR(food_type = 'Non-Veg')
      INTO v_combined_event_ids, v_has_nonveg
      FROM (
        SELECT unnest(coalesce(event_ids, ARRAY[event_id])) AS ev_id, food_type
          FROM public.students
         WHERE id = ANY(r.ids)
      ) sub;

    -- Update primary student record with combined event_ids & food_type
    UPDATE public.students
       SET event_ids = v_combined_event_ids,
           food_type = CASE WHEN v_has_nonveg THEN 'Non-Veg' ELSE food_type END
     WHERE id = v_master_id;

    -- Re-link certificates pointing to duplicate IDs
    UPDATE public.certificates
       SET student_id = v_master_id
     WHERE student_id = ANY(v_dup_ids);

    -- Delete duplicate student rows
    DELETE FROM public.students
     WHERE id = ANY(v_dup_ids);
  END LOOP;

  -- 3b. Clean up duplicates by college_id + student_name when roll_no is empty
  FOR r IN 
    SELECT college_id, lower(trim(student_name)) AS clean_name, ARRAY_AGG(id ORDER BY created_at ASC) AS ids
      FROM public.students
     WHERE (roll_no IS NULL OR trim(roll_no) = '' OR trim(roll_no) = '-')
     GROUP BY college_id, lower(trim(student_name))
    HAVING COUNT(*) > 1
  LOOP
    v_master_id := r.ids[1];
    v_dup_ids := r.ids[2:array_length(r.ids, 1)];

    SELECT ARRAY_AGG(DISTINCT ev_id),
           LOGICAL_OR(food_type = 'Non-Veg')
      INTO v_combined_event_ids, v_has_nonveg
      FROM (
        SELECT unnest(coalesce(event_ids, ARRAY[event_id])) AS ev_id, food_type
          FROM public.students
         WHERE id = ANY(r.ids)
      ) sub;

    UPDATE public.students
       SET event_ids = v_combined_event_ids,
           food_type = CASE WHEN v_has_nonveg THEN 'Non-Veg' ELSE food_type END
     WHERE id = v_master_id;

    UPDATE public.certificates
       SET student_id = v_master_id
     WHERE student_id = ANY(v_dup_ids);

    DELETE FROM public.students
     WHERE id = ANY(v_dup_ids);
  END LOOP;
END $$;

-- 4. Update register_team RPC function to update existing participants instead of adding duplicate rows
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
  v_roll_nos    text[];
  v_event_prelim time;
  v_event_mains  time;
  v_conflicting_event_name text;
BEGIN
  -- Load target event details & schedule
  SELECT minimum_participants, maximum_participants, preliminary, mains
    INTO v_min, v_max, v_event_prelim, v_event_mains
    FROM public.events WHERE id = p_event_id;

  IF v_min IS NULL THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  v_count := jsonb_array_length(p_participants);
  IF v_count < v_min THEN
    RAISE EXCEPTION 'Needs at least % participants -- currently %.', v_min, v_count;
  END IF;
  IF v_count > v_max THEN
    RAISE EXCEPTION 'Maximum % participants allowed -- currently %.', v_max, v_count;
  END IF;

  -- Extract and verify names
  SELECT array_agg(lower(trim(elem->>'studentName')))
    INTO v_names
    FROM jsonb_array_elements(p_participants) elem;

  IF array_length(v_names, 1) <> (SELECT count(distinct x) FROM unnest(v_names) x) THEN
    RAISE EXCEPTION 'Two participants in this team have the same name.';
  END IF;

  -- Extract and verify roll numbers uniqueness within the submission
  SELECT array_agg(lower(trim(elem->>'rollNo')))
    INTO v_roll_nos
    FROM jsonb_array_elements(p_participants) elem;

  IF array_length(v_roll_nos, 1) <> (SELECT count(distinct x) FROM unnest(v_roll_nos) x) THEN
    RAISE EXCEPTION 'Two participants in this team have the same roll number.';
  END IF;

  -- Verify roll number uniqueness and schedule conflicts against existing college students
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants) LOOP
    -- Check if student is already in this exact event
    IF EXISTS (
      SELECT 1 FROM public.students 
       WHERE college_id = p_college_id 
         AND (event_id = p_event_id OR p_event_id = ANY(coalesce(event_ids, ARRAY[event_id])))
         AND lower(trim(roll_no)) = lower(trim(v_participant->>'rollNo'))
    ) THEN
      RAISE EXCEPTION 'Participant with roll number "%" is already registered in this event.', v_participant->>'rollNo';
    END IF;

    -- Check schedule conflict against all events the student is currently registered in
    SELECT e.event_name INTO v_conflicting_event_name
      FROM public.students s
      JOIN public.events e ON (e.id = s.event_id OR e.id = ANY(coalesce(s.event_ids, ARRAY[s.event_id])))
     WHERE s.college_id = p_college_id
       AND lower(trim(s.roll_no)) = lower(trim(v_participant->>'rollNo'))
       AND (
         (e.preliminary IS NOT NULL AND v_event_prelim IS NOT NULL AND e.preliminary = v_event_prelim) OR
         (e.mains IS NOT NULL AND v_event_mains IS NOT NULL AND e.mains = v_event_mains)
       )
     LIMIT 1;

    IF v_conflicting_event_name IS NOT NULL THEN
      RAISE EXCEPTION 'Schedule conflict! Roll number "%" is already registered in "%" at the same time.', 
        v_participant->>'rollNo', v_conflicting_event_name;
    END IF;
  END LOOP;

  INSERT INTO public.registrations (college_id, leader_id, event_id, status)
  VALUES (p_college_id, p_leader_id, p_event_id, 'pending')
  RETURNING id INTO v_reg_id;

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants) LOOP
    DECLARE
      v_existing_id   uuid;
      v_current_food text;
      v_new_food     text := coalesce(v_participant->>'food', v_participant->>'foodType', '-');
    BEGIN
      SELECT id, food_type INTO v_existing_id, v_current_food
        FROM public.students
       WHERE college_id = p_college_id
         AND lower(trim(roll_no)) = lower(trim(v_participant->>'rollNo'))
       LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        -- Update existing student: append new event_id to event_ids array & update food choice if Non-Veg
        UPDATE public.students
           SET event_ids = CASE 
                 WHEN p_event_id = ANY(coalesce(event_ids, ARRAY[event_id])) THEN coalesce(event_ids, ARRAY[event_id])
                 ELSE array_append(coalesce(event_ids, ARRAY[event_id]), p_event_id)
               END,
               food_type = CASE 
                 WHEN v_new_food = 'Non-Veg' THEN 'Non-Veg'
                 WHEN v_current_food = 'Non-Veg' THEN 'Non-Veg'
                 WHEN v_new_food = 'Veg' THEN 'Veg'
                 ELSE coalesce(v_current_food, '-')
               END,
               student_name = coalesce(v_participant->>'studentName', student_name),
               student_name_normalized = lower(trim(coalesce(v_participant->>'studentName', student_name))),
               gender = CASE WHEN coalesce(gender, '-') = '-' THEN coalesce(v_participant->>'gender', '-') ELSE gender END,
               department = CASE WHEN coalesce(department, '-') = '-' THEN coalesce(v_participant->>'department', '-') ELSE department END
         WHERE id = v_existing_id;
      ELSE
        -- Insert new student record
        INSERT INTO public.students (
          student_name, student_name_normalized, roll_no, food_type,
          gender, department, year,
          registration_id, leader_id, college_id, event_id, event_ids, certificate_status
        ) VALUES (
          v_participant->>'studentName',
          lower(trim(v_participant->>'studentName')),
          v_participant->>'rollNo',
          v_new_food,
          v_participant->>'gender',
          v_participant->>'department',
          v_participant->>'year',
          v_reg_id, p_leader_id, p_college_id, p_event_id, ARRAY[p_event_id], 'not issued'
        );
      END IF;
    END;
  END LOOP;

  RETURN v_reg_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This college has already registered for this event.';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Registration failed: The student leader or college profile is invalid or has been deleted.';
END;
$$;
