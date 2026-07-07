-- ========================================================================
-- STRATA — Database Update Script v2 (Registration & Lots Replan)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ========================================================================

-- 1. Rename college_name to college in colleges table safely (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'colleges' AND column_name = 'college_name'
  ) THEN
    ALTER TABLE public.colleges RENAME COLUMN college_name TO college;
  END IF;
END $$;

-- Create venues table
DROP TABLE IF EXISTS public.venues CASCADE;
CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on venues
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues: public read" ON public.venues FOR SELECT USING (true);
CREATE POLICY "venues: admin write" ON public.venues FOR ALL USING (current_role_name() = 'admin');

-- Seed initial dummy venues
INSERT INTO public.venues (venue_name) VALUES
  ('Seminar Hall I'),
  ('CS Lab III'),
  ('Conference Hall');

-- Alter events table safely to drop old fields and add new columns if they do not exist
DO $$
BEGIN
  -- Drop old columns if they exist
  ALTER TABLE public.events DROP COLUMN IF EXISTS prelims_date;
  ALTER TABLE public.events DROP COLUMN IF EXISTS mains_date;
  ALTER TABLE public.events DROP COLUMN IF EXISTS prelims_venue;
  ALTER TABLE public.events DROP COLUMN IF EXISTS mains_venue;
  ALTER TABLE public.events DROP COLUMN IF EXISTS registration_fee;
  ALTER TABLE public.events DROP COLUMN IF EXISTS minimum_participants;
  ALTER TABLE public.events DROP COLUMN IF EXISTS maximum_participants;
  ALTER TABLE public.events DROP COLUMN IF EXISTS details;
  ALTER TABLE public.events DROP COLUMN IF EXISTS venue;

  -- Recreate team_size if it is text
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'team_size' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.events DROP COLUMN team_size;
  END IF;

  -- Add columns if not exist
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS prelims_venue uuid REFERENCES public.venues(id) ON DELETE SET NULL;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mains_venue uuid REFERENCES public.venues(id) ON DELETE SET NULL;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS preliminary time;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mains time;
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS team_size int NOT NULL DEFAULT 1;
END $$;

-- Recreate register_team function to use the new team_size integer check
CREATE OR REPLACE FUNCTION register_team(
  p_college_id uuid,
  p_leader_id uuid,
  p_event_id uuid,
  p_participants jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_size int;
  v_count int;
  v_reg_id uuid;
  v_participant jsonb;
  v_names text[];
BEGIN
  SELECT team_size
    INTO v_size
    FROM events WHERE id = p_event_id;

  IF v_size IS NULL THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  v_count := jsonb_array_length(p_participants);
  IF v_count <> v_size THEN
    RAISE EXCEPTION 'Team size must be exactly % participants — currently %.', v_size, v_count;
  END IF;

  -- Catch within-team duplicates
  SELECT array_agg(lower(trim(elem->>'studentName')))
    INTO v_names
    FROM jsonb_array_elements(p_participants) elem;

  IF array_length(v_names, 1) <> (SELECT count(distinct x) FROM unnest(v_names) x) then
    RAISE EXCEPTION 'Two participants in this team have the same name.';
  END IF;

  INSERT INTO registrations (college_id, leader_id, event_id, status)
  VALUES (p_college_id, p_leader_id, p_event_id, 'pending')
  RETURNING id INTO v_reg_id;

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    INSERT INTO students (
      student_name, student_name_normalized, gender, department, year,
      registration_id, leader_id, college_id, event_id, certificate_status
    ) VALUES (
      v_participant->>'studentName',
      lower(trim(v_participant->>'studentName')),
      v_participant->>'gender',
      v_participant->>'department',
      v_participant->>'year',
      v_reg_id, p_leader_id, p_college_id, p_event_id, 'not issued'
    );
  END LOOP;

  RETURN v_reg_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This college has already registered for this event, or one of these participant names is already registered elsewhere.';
END;
$$;

-- 2. Drop and Recreate the public.lots table with the correct fields
DROP TABLE IF EXISTS public.lots CASCADE;

CREATE TABLE public.lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_name text NOT NULL,
  is_assigned boolean NOT NULL DEFAULT false,
  assigned_college text NOT NULL DEFAULT '-',
  created_at timestamptz DEFAULT now()
);

-- Re-enable RLS on lots
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lots: signed-in read" ON public.lots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lots: admin write" ON public.lots FOR ALL USING (current_role_name() = 'admin');

-- 3. Replace register_guest_team function to allocate lots automatically
DROP FUNCTION IF EXISTS public.register_guest_team(text,text,text,text,text,text,text,text,text,integer,integer,jsonb);

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

  -- Return the generated IDs as a single row
  RETURN QUERY SELECT v_leader_id, v_college_id;
END;
$$;

-- 4. Create profile creation helper function (Security Definer to bypass RLS for leader signup)
CREATE OR REPLACE FUNCTION create_leader_profile(
  p_user_id uuid,
  p_ref_id uuid,
  p_college_id uuid,
  p_name text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, ref_id, college_id)
  VALUES (p_user_id, 'leader', p_name, p_ref_id, p_college_id)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- 5. Auto-confirm emails trigger to allow all student leaders to log in immediately
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.email_confirmed_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_confirm_email ON auth.users;
CREATE TRIGGER tr_auto_confirm_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();

-- 6. Seed contact us settings (if they do not already exist)
INSERT INTO public.settings (key_name, value) VALUES 
  ('contact_email', 'cs@anjaconline.org')
  ON CONFLICT (key_name) DO NOTHING;

INSERT INTO public.settings (key_name, value) VALUES 
  ('contact_phone', '+91 98765 43210')
  ON CONFLICT (key_name) DO NOTHING;

INSERT INTO public.settings (key_name, value) VALUES 
  ('contact_address', 'Department of Computer Science, Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi - Srivilliputhur Road, Sivakasi - 626 124, Tamil Nadu, India.')
  ON CONFLICT (key_name) DO NOTHING;

INSERT INTO public.settings (key_name, value) VALUES 
  ('contact_extra', 'Venue Coordinator: Dr. V. Venkatesh Babu (HOD, CS Dept.)')
  ON CONFLICT (key_name) DO NOTHING;

-- 7. Reset and truncate existing test data
TRUNCATE TABLE public.students CASCADE;
TRUNCATE TABLE public.registrations CASCADE;
TRUNCATE TABLE public.student_leaders CASCADE;
TRUNCATE TABLE public.colleges CASCADE;

-- Safe deletion of non-admin auth accounts to prevent signup duplication issues
DELETE FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles WHERE role = 'admin');
DELETE FROM public.profiles WHERE role != 'admin';

-- 8. Seed 2 dummy lots (Lot 1, Lot 2)
INSERT INTO public.lots (lot_name, is_assigned, assigned_college) VALUES
  ('Lot 1', false, '-'),
  ('Lot 2', false, '-');

-- 9. Add winning_prize to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS winning_prize text DEFAULT NULL;

-- Add is_paid to colleges table
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;

-- Create winners table
DROP TABLE IF EXISTS public.winners CASCADE;
CREATE TABLE public.winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
  first_place text DEFAULT '-',
  second_place text DEFAULT '-',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on winners
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "winners: public read" ON public.winners FOR SELECT USING (true);
CREATE POLICY "winners: admin write" ON public.winners FOR ALL USING (current_role_name() = 'admin');

-- Trigger to automatically assign winning_prize to students of the winning lot/college
CREATE OR REPLACE FUNCTION sync_winning_prizes()
RETURNS trigger AS $$
DECLARE
  v_first_college text;
  v_first_college_id uuid;
  v_second_college text;
  v_second_college_id uuid;
BEGIN
  -- 1. Reset all student winning prizes for this event
  UPDATE public.students 
     SET winning_prize = NULL 
   WHERE event_id = NEW.event_id;

  -- 2. Apply First Place prize
  IF NEW.first_place IS NOT NULL AND NEW.first_place <> '-' THEN
    SELECT assigned_college INTO v_first_college FROM public.lots WHERE lot_name = NEW.first_place LIMIT 1;
    IF v_first_college IS NOT NULL THEN
      SELECT id INTO v_first_college_id FROM public.colleges WHERE college = v_first_college LIMIT 1;
      IF v_first_college_id IS NOT NULL THEN
        UPDATE public.students 
           SET winning_prize = 'First Place' 
         WHERE event_id = NEW.event_id AND college_id = v_first_college_id;
      END IF;
    END IF;
  END IF;

  -- 3. Apply Second Place prize
  IF NEW.second_place IS NOT NULL AND NEW.second_place <> '-' THEN
    SELECT assigned_college INTO v_second_college FROM public.lots WHERE lot_name = NEW.second_place LIMIT 1;
    IF v_second_college IS NOT NULL THEN
      SELECT id INTO v_second_college_id FROM public.colleges WHERE college = v_second_college LIMIT 1;
      IF v_second_college_id IS NOT NULL THEN
        UPDATE public.students 
           SET winning_prize = 'Second Place' 
         WHERE event_id = NEW.event_id AND college_id = v_second_college_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_winning_prizes ON public.winners;
CREATE TRIGGER tr_sync_winning_prizes
  AFTER INSERT OR UPDATE ON public.winners
  FOR EACH ROW
  EXECUTE FUNCTION sync_winning_prizes();

-- Trigger to clear winning_prize when a winner is deleted
CREATE OR REPLACE FUNCTION clean_deleted_winning_prizes()
RETURNS trigger AS $$
BEGIN
  UPDATE public.students 
     SET winning_prize = NULL 
   WHERE event_id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_clean_deleted_winning_prizes ON public.winners;
CREATE TRIGGER tr_clean_deleted_winning_prizes
  AFTER DELETE ON public.winners
  FOR EACH ROW
  EXECUTE FUNCTION clean_deleted_winning_prizes();

-- Create payment_polls table
DROP TABLE IF EXISTS public.payment_polls CASCADE;
CREATE TABLE public.payment_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_name text NOT NULL,
  poll_key varchar(6) NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create payment_logs table
DROP TABLE IF EXISTS public.payment_logs CASCADE;
CREATE TABLE public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.payment_polls(id) ON DELETE SET NULL,
  poll_name text NOT NULL,
  college_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- payment_polls policies
CREATE POLICY "payment_polls: public read" ON public.payment_polls FOR SELECT USING (true);
CREATE POLICY "payment_polls: admin write" ON public.payment_polls FOR ALL USING (current_role_name() = 'admin');

-- Seed default fee_per_student setting
INSERT INTO public.settings (key_name, value) VALUES ('fee_per_student', '100')
  ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;

-- ========================================================================
-- Public read policies for the standalone /payment operator page.
-- These tables already have RLS enabled; we only add SELECT policies.
-- ========================================================================

-- colleges: public read (needed for payment page)
DROP POLICY IF EXISTS "colleges: public read" ON public.colleges;
CREATE POLICY "colleges: public read" ON public.colleges FOR SELECT USING (true);

-- lots: public read
DROP POLICY IF EXISTS "lots: public read" ON public.lots;
CREATE POLICY "lots: public read" ON public.lots FOR SELECT USING (true);

-- registrations: public read
DROP POLICY IF EXISTS "registrations: public read" ON public.registrations;
CREATE POLICY "registrations: public read" ON public.registrations FOR SELECT USING (true);

-- students: public read
DROP POLICY IF EXISTS "students: public read" ON public.students;
CREATE POLICY "students: public read" ON public.students FOR SELECT USING (true);

-- settings: public read
DROP POLICY IF EXISTS "settings: public read" ON public.settings;
CREATE POLICY "settings: public read" ON public.settings FOR SELECT USING (true);

-- colleges: allow payment page to update is_paid
DROP POLICY IF EXISTS "colleges: payment update" ON public.colleges;
CREATE POLICY "colleges: payment update" ON public.colleges FOR UPDATE USING (true) WITH CHECK (true);

-- payment_logs: public insert (already added above, but ensure it is present)
DROP POLICY IF EXISTS "payment_logs: public insert" ON public.payment_logs;
CREATE POLICY "payment_logs: public insert" ON public.payment_logs FOR INSERT WITH CHECK (true);

-- payment_logs: admin read
DROP POLICY IF EXISTS "payment_logs: admin read" ON public.payment_logs;
CREATE POLICY "payment_logs: admin read" ON public.payment_logs FOR SELECT USING (true);

-- payment_polls: public read for key validation
DROP POLICY IF EXISTS "payment_polls: public read" ON public.payment_polls;
CREATE POLICY "payment_polls: public read" ON public.payment_polls FOR SELECT USING (true);





