-- ============================================================================
-- STRATA 2K26 — Unified Database Schema, Migration & Seed Script
-- Run this in your Supabase SQL Editor: https://supabase.com
-- ============================================================================

-- ============================================================================
-- PHASE 0: Clean existing transactional data (OPTIONAL - UNCOMMENT ONLY IF YOU WANT A BLANK DB)
-- ============================================================================
-- DO $$
-- BEGIN
--   SET session_replication_role = 'replica';
--   IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'certificates') THEN TRUNCATE TABLE public.certificates CASCADE; END IF;
--   IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN TRUNCATE TABLE public.payments CASCADE; END IF;
--   IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN TRUNCATE TABLE public.students CASCADE; END IF;
--   IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'registrations') THEN TRUNCATE TABLE public.registrations CASCADE; END IF;
--   IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_leaders') THEN TRUNCATE TABLE public.student_leaders CASCADE; END IF;
--   SET session_replication_role = 'origin';
-- END $$;


-- ============================================================================
-- PHASE 1: Extensions & Basic Configurations
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================================
-- PHASE 2: Create Tables (If Not Exists)
-- ============================================================================

-- 2a. settings
CREATE TABLE IF NOT EXISTS public.settings (
  key_name text PRIMARY KEY,
  value    text NOT NULL DEFAULT ''
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 2b. leaders
CREATE TABLE IF NOT EXISTS public.leaders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  position    text        NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaders ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.leaders ALTER COLUMN description DROP NOT NULL;

-- 2c. rules
CREATE TABLE IF NOT EXISTS public.rules (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  points     text        NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- 2d. venues
CREATE TABLE IF NOT EXISTS public.venues (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- 2e. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text  NOT NULL CHECK (role IN ('admin','leader','accountant','incharge')),
  name       text,
  ref_id     uuid,
  college_id uuid
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','leader','accountant','incharge'));

-- Safe column additions for existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ref_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_id uuid;

-- 2f. admins
CREATE TABLE IF NOT EXISTS public.admins (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 2g. accountants
CREATE TABLE IF NOT EXISTS public.accountants (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.accountants ENABLE ROW LEVEL SECURITY;

-- 2h. incharges
CREATE TABLE IF NOT EXISTS public.incharges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.incharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incharges ADD COLUMN IF NOT EXISTS email text;

-- 2i. events
CREATE TABLE IF NOT EXISTS public.events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text        NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Safe additions of columns for existing events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category             text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description          text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rules                text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS staff_incharge       text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS team_size            int  NOT NULL DEFAULT 1;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS minimum_participants int  NOT NULL DEFAULT 1;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS maximum_participants int  NOT NULL DEFAULT 1;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS prelims_venue        uuid REFERENCES public.venues(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mains_venue          uuid REFERENCES public.venues(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS preliminary          time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mains                time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status               text NOT NULL DEFAULT 'active';

-- Safe additions of columns for existing incharges table
ALTER TABLE public.incharges ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

-- 2j. colleges
CREATE TABLE IF NOT EXISTS public.colleges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  college    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS department         text;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS phone              text;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS email              text;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS address            text;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS status             text NOT NULL DEFAULT 'active';
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS is_paid            boolean NOT NULL DEFAULT false;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS paid_student_count  int     NOT NULL DEFAULT 0;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS payment_screenshot text;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS qr_code            text;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS qr_image_data_url   text;

-- Rename legacy column college_name to college if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'colleges'
      AND column_name = 'college_name'
  ) THEN
    ALTER TABLE public.colleges RENAME COLUMN college_name TO college;
  END IF;
END $$;

-- 2k. student_leaders
CREATE TABLE IF NOT EXISTS public.student_leaders (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.student_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_leaders ADD COLUMN IF NOT EXISTS phone      text;
ALTER TABLE public.student_leaders ADD COLUMN IF NOT EXISTS email      text;
ALTER TABLE public.student_leaders ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.student_leaders ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.student_leaders ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'active';

-- Enforce max 1 leader per college
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'student_leaders_college_id_key'
      AND table_name = 'student_leaders'
  ) THEN
    ALTER TABLE public.student_leaders
      ADD CONSTRAINT student_leaders_college_id_key UNIQUE (college_id);
  END IF;
END $$;

-- 2l. lots
CREATE TABLE IF NOT EXISTS public.lots (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_name         text        NOT NULL,
  is_assigned      boolean     NOT NULL DEFAULT false,
  assigned_college text        NOT NULL DEFAULT '-',
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

-- 2m. registrations
CREATE TABLE IF NOT EXISTS public.registrations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS college_id   uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS leader_id    uuid REFERENCES public.student_leaders(id) ON DELETE SET NULL;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS event_id     uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS lot_id       uuid REFERENCES public.lots(id) ON DELETE SET NULL;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','lot_assigned','paid','approved','rejected'));
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS veg_count    int NOT NULL DEFAULT 0;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS nonveg_count int NOT NULL DEFAULT 0;

-- Enforce unique college_id and event_id registration pair
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registrations_college_id_event_id_key'
      AND table_name = 'registrations'
  ) THEN
    ALTER TABLE public.registrations
      ADD CONSTRAINT registrations_college_id_event_id_key UNIQUE (college_id, event_id);
  END IF;
END $$;

-- 2n. students
CREATE TABLE IF NOT EXISTS public.students (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_name_normalized text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS roll_no                  text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender                  text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS department              text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS year                    text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email                   text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS registration_id         uuid REFERENCES public.registrations(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS leader_id               uuid REFERENCES public.student_leaders(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS college_id              uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS event_id                uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS certificate_status      text NOT NULL DEFAULT 'not issued';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS food_type               text CHECK (food_type IN ('Veg', 'Non-Veg', '-'));
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS winner_place            text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS winning_prize           text;

-- 2o. certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid        REFERENCES public.students(id) ON DELETE CASCADE,
  cert_type  text,
  issued_at  timestamptz DEFAULT now()
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Ensure required columns exist on certificates
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS event_id            uuid REFERENCES public.events(id) ON DELETE SET NULL;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS position            text;   -- 'Participation', '1st Place', '2nd Place'
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS certificate_number  text;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS created_at          timestamptz DEFAULT now();

-- 2p. payments
CREATE TABLE IF NOT EXISTS public.payments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid        REFERENCES public.colleges(id) ON DELETE CASCADE,
  amount     numeric,
  paid_at    timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 2q. payment_polls
CREATE TABLE IF NOT EXISTS public.payment_polls (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_name  text        NOT NULL,
  poll_key   varchar(6)  NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payment_polls ENABLE ROW LEVEL SECURITY;

-- 2r. payment_logs
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      uuid        REFERENCES public.payment_polls(id) ON DELETE SET NULL,
  poll_name    text        NOT NULL,
  college_name text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ADD COLUMN IF NOT EXISTS amount         numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payment_logs ADD COLUMN IF NOT EXISTS students_count int NOT NULL DEFAULT 0;

-- 2s. winners
CREATE TABLE IF NOT EXISTS public.winners (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid        REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
  first_place  text        DEFAULT '-',
  second_place text        DEFAULT '-',
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS prelim_winners text[] DEFAULT '{}';
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS prelims_published boolean DEFAULT false;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS mains_published boolean DEFAULT false;

-- 2t. feedbacks
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id    uuid        REFERENCES public.student_leaders(id) ON DELETE CASCADE,
  college_id   uuid        REFERENCES public.colleges(id) ON DELETE CASCADE,
  college_name text,
  department   text,
  title        text        NOT NULL,
  description  text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- PHASE 2z: Drop all legacy open-access policies
-- ALL tables are created above, so DROP POLICY IF EXISTS is safe here.
-- ============================================================================

-- Drop all legacy PHASE 2z open policies from every table
DO $$ BEGIN
  -- settings
  DROP POLICY IF EXISTS "settings_read_all"    ON public.settings;
  DROP POLICY IF EXISTS "settings_write_admin" ON public.settings;
  -- leaders
  DROP POLICY IF EXISTS "leaders_read_all"    ON public.leaders;
  DROP POLICY IF EXISTS "leaders_write_admin" ON public.leaders;
  -- rules
  DROP POLICY IF EXISTS "rules_read_all"    ON public.rules;
  DROP POLICY IF EXISTS "rules_write_admin" ON public.rules;
  -- venues
  DROP POLICY IF EXISTS "venues_read_all"    ON public.venues;
  DROP POLICY IF EXISTS "venues_write_admin" ON public.venues;
  -- profiles
  DROP POLICY IF EXISTS "profiles_read_all"  ON public.profiles;
  DROP POLICY IF EXISTS "profiles_write_all" ON public.profiles;
  -- admins
  DROP POLICY IF EXISTS "admins_read_all"    ON public.admins;
  DROP POLICY IF EXISTS "admins_write_admin" ON public.admins;
  -- accountants
  DROP POLICY IF EXISTS "accountants_read_all"    ON public.accountants;
  DROP POLICY IF EXISTS "accountants_write_admin" ON public.accountants;
  -- incharges
  DROP POLICY IF EXISTS "incharges_read_all"    ON public.incharges;
  DROP POLICY IF EXISTS "incharges_write_admin" ON public.incharges;
  -- events
  DROP POLICY IF EXISTS "events_read_all"    ON public.events;
  DROP POLICY IF EXISTS "events_write_admin" ON public.events;
  -- colleges
  DROP POLICY IF EXISTS "colleges_read_all"    ON public.colleges;
  DROP POLICY IF EXISTS "colleges_write_admin" ON public.colleges;
  -- student_leaders
  DROP POLICY IF EXISTS "student_leaders_read_all"    ON public.student_leaders;
  DROP POLICY IF EXISTS "student_leaders_write_admin" ON public.student_leaders;
  -- lots
  DROP POLICY IF EXISTS "lots_read_all"    ON public.lots;
  DROP POLICY IF EXISTS "lots_write_admin" ON public.lots;
  -- registrations
  DROP POLICY IF EXISTS "registrations_read_all"  ON public.registrations;
  DROP POLICY IF EXISTS "registrations_write_all" ON public.registrations;
  -- students
  DROP POLICY IF EXISTS "students_read_all"  ON public.students;
  DROP POLICY IF EXISTS "students_write_all" ON public.students;
  -- certificates
  DROP POLICY IF EXISTS "certificates_read_all"    ON public.certificates;
  DROP POLICY IF EXISTS "certificates_write_admin" ON public.certificates;
  -- payments
  DROP POLICY IF EXISTS "payments_read_all"    ON public.payments;
  DROP POLICY IF EXISTS "payments_write_admin" ON public.payments;
  -- payment_polls
  DROP POLICY IF EXISTS "payment_polls_read_all"    ON public.payment_polls;
  DROP POLICY IF EXISTS "payment_polls_write_admin" ON public.payment_polls;
  -- payment_logs
  DROP POLICY IF EXISTS "payment_logs_read_all"    ON public.payment_logs;
  DROP POLICY IF EXISTS "payment_logs_write_admin" ON public.payment_logs;
  -- winners
  DROP POLICY IF EXISTS "winners_read_all"    ON public.winners;
  DROP POLICY IF EXISTS "winners_write_admin" ON public.winners;
END $$;

-- ============================================================================
-- PHASE 3: Database Helper Functions & Trigger Definitions
-- ============================================================================

-- Helper to check user role
CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 3a. Normalize student names (trigger helper)
CREATE OR REPLACE FUNCTION public.normalize_student_name_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.student_name_normalized := lower(trim(NEW.student_name));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_student_name ON public.students;
CREATE TRIGGER trg_normalize_student_name
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.normalize_student_name_trigger();

-- 3b. Sync winning prizes (trigger helper)
CREATE OR REPLACE FUNCTION public.sync_winning_prizes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_first_college     text;
  v_first_college_id  uuid;
  v_second_college    text;
  v_second_college_id uuid;
BEGIN
  UPDATE public.students SET winning_prize = NULL WHERE event_id = NEW.event_id;

  IF NEW.first_place IS NOT NULL AND NEW.first_place <> '-' THEN
    SELECT assigned_college INTO v_first_college
      FROM public.lots WHERE lot_name = NEW.first_place LIMIT 1;
    IF v_first_college IS NOT NULL THEN
      SELECT id INTO v_first_college_id FROM public.colleges
        WHERE lower(trim(CASE WHEN department IS NOT NULL AND trim(department) <> '' THEN college || ' (' || department || ')' ELSE college END)) = lower(trim(v_first_college)) LIMIT 1;
      IF v_first_college_id IS NOT NULL THEN
        UPDATE public.students SET winning_prize = 'First Place'
          WHERE event_id = NEW.event_id AND college_id = v_first_college_id;
      END IF;
    END IF;
  END IF;

  IF NEW.second_place IS NOT NULL AND NEW.second_place <> '-' THEN
    SELECT assigned_college INTO v_second_college
      FROM public.lots WHERE lot_name = NEW.second_place LIMIT 1;
    IF v_second_college IS NOT NULL THEN
      SELECT id INTO v_second_college_id FROM public.colleges
        WHERE lower(trim(CASE WHEN department IS NOT NULL AND trim(department) <> '' THEN college || ' (' || department || ')' ELSE college END)) = lower(trim(v_second_college)) LIMIT 1;
      IF v_second_college_id IS NOT NULL THEN
        UPDATE public.students SET winning_prize = 'Second Place'
          WHERE event_id = NEW.event_id AND college_id = v_second_college_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_winning_prizes ON public.winners;
CREATE TRIGGER tr_sync_winning_prizes
  AFTER INSERT OR UPDATE ON public.winners
  FOR EACH ROW EXECUTE FUNCTION public.sync_winning_prizes();

-- 3c. Clean winning prizes on deletion
CREATE OR REPLACE FUNCTION public.clean_deleted_winning_prizes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.students SET winning_prize = NULL WHERE event_id = OLD.event_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tr_clean_deleted_winning_prizes ON public.winners;
CREATE TRIGGER tr_clean_deleted_winning_prizes
  AFTER DELETE ON public.winners
  FOR EACH ROW EXECUTE FUNCTION public.clean_deleted_winning_prizes();

-- 3d. Automated Lot assignment trigger (Run BEFORE INSERT to set lot_id & status)
CREATE OR REPLACE FUNCTION assign_lot_automatically()
RETURNS TRIGGER AS $$
DECLARE
  v_college_name text;
  v_department text;
  v_college_with_dept text;
  v_lot_id uuid;
BEGIN
  -- Fetch college and department name
  SELECT college, department INTO v_college_name, v_department FROM colleges WHERE id = NEW.college_id;
  
  IF v_college_name IS NOT NULL THEN
    IF v_department IS NOT NULL AND trim(v_department) <> '' THEN
      v_college_with_dept := v_college_name || ' (' || v_department || ')';
    ELSE
      v_college_with_dept := v_college_name;
    END IF;

    -- Check if a lot is already assigned to this college/department (and lock the row)
    SELECT id INTO v_lot_id FROM lots 
     WHERE lower(trim(assigned_college)) = lower(trim(v_college_with_dept)) 
     LIMIT 1
     FOR UPDATE;
    
    -- If no lot is assigned, find the first available unassigned lot and lock it exclusively
    IF v_lot_id IS NULL THEN
      SELECT id INTO v_lot_id FROM lots 
       WHERE is_assigned = false 
       ORDER BY lot_name ASC 
       LIMIT 1
       FOR UPDATE SKIP LOCKED;
      
      -- If an unassigned lot is found, claim it for this college/department
      IF v_lot_id IS NOT NULL THEN
        UPDATE lots 
           SET is_assigned = true, 
               assigned_college = v_college_with_dept 
         WHERE id = v_lot_id;
      END IF;
    END IF;
    
    -- Assign the lot_id to the registration
    IF v_lot_id IS NOT NULL THEN
      NEW.lot_id := v_lot_id;
      IF NEW.status = 'pending' THEN
        NEW.status := 'lot_assigned';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_lot_automatically ON registrations;
CREATE TRIGGER trg_assign_lot_automatically
  BEFORE INSERT ON registrations
  FOR EACH ROW EXECUTE FUNCTION assign_lot_automatically();

-- Trigger for Google OAuth profile role sync
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  v_role text := 'leader';
  v_name text;
  v_ref_id uuid;
  v_college_id uuid;
BEGIN
  SELECT 'admin', name, id INTO v_role, v_name, v_ref_id
    FROM public.admins
   WHERE lower(trim(email)) = lower(trim(NEW.email))
   LIMIT 1;

  IF v_ref_id IS NULL THEN
    SELECT 'leader', name, id, college_id INTO v_role, v_name, v_ref_id, v_college_id
      FROM public.student_leaders
     WHERE lower(trim(email)) = lower(trim(NEW.email))
     LIMIT 1;
  END IF;

  IF v_ref_id IS NULL THEN
    SELECT 'incharge', name, id INTO v_role, v_name, v_ref_id
      FROM public.incharges
     WHERE lower(trim(email)) = lower(trim(NEW.email))
     LIMIT 1;
  END IF;

  IF v_ref_id IS NULL THEN
    SELECT 'accountant', name, id INTO v_role, v_name, v_ref_id
      FROM public.accountants
     WHERE lower(trim(email)) = lower(trim(NEW.email))
     LIMIT 1;
  END IF;

  -- If unrecognized user, DO NOT create a public profiles row
  IF v_ref_id IS NULL THEN
    RETURN NEW;
  END IF;

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

DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;
CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3e. register_team RPC function
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
         AND event_id = p_event_id
         AND lower(trim(roll_no)) = lower(trim(v_participant->>'rollNo'))
    ) THEN
      RAISE EXCEPTION 'Participant with roll number "%" is already registered in this event.', v_participant->>'rollNo';
    END IF;

    -- Check schedule conflict
    SELECT e.event_name INTO v_conflicting_event_name
      FROM public.students s
      JOIN public.events e ON s.event_id = e.id
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
    INSERT INTO public.students (
      student_name, student_name_normalized, roll_no, food_type,
      gender, department, year,
      registration_id, leader_id, college_id, event_id, certificate_status
    ) VALUES (
      v_participant->>'studentName',
      lower(trim(v_participant->>'studentName')),
      v_participant->>'rollNo',
      coalesce(v_participant->>'food', v_participant->>'foodType', '-'),
      v_participant->>'gender',
      v_participant->>'department',
      v_participant->>'year',
      v_reg_id, p_leader_id, p_college_id, p_event_id, 'not issued'
    );
  END LOOP;

  RETURN v_reg_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This college has already registered for this event.';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Registration failed: The student leader or college profile is invalid or has been deleted.';
END;
$$;

-- Trigger to sync profiles when public.admins row is inserted or updated
CREATE OR REPLACE FUNCTION public.sync_profile_on_admin_change()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE lower(trim(email)) = lower(trim(NEW.email))
   LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, role, name, ref_id, college_id)
    VALUES (v_user_id, 'admin', NEW.name, NEW.id, NULL)
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        ref_id = EXCLUDED.ref_id,
        college_id = EXCLUDED.college_id,
        name = EXCLUDED.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_on_admin_change ON public.admins;
CREATE TRIGGER trg_sync_profile_on_admin_change
  AFTER INSERT OR UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_on_admin_change();

-- Trigger to sync profiles when public.student_leaders row is inserted or updated
CREATE OR REPLACE FUNCTION public.sync_profile_on_leader_change()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find the user ID matching the email
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE lower(trim(email)) = lower(trim(NEW.email))
   LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, role, name, ref_id, college_id)
    VALUES (v_user_id, 'leader', NEW.name, NEW.id, NEW.college_id)
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        ref_id = EXCLUDED.ref_id,
        college_id = EXCLUDED.college_id,
        name = EXCLUDED.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_on_leader_change ON public.student_leaders;
CREATE TRIGGER trg_sync_profile_on_leader_change
  AFTER INSERT OR UPDATE ON public.student_leaders
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_on_leader_change();

-- Trigger to sync profiles when public.incharges row is inserted or updated
CREATE OR REPLACE FUNCTION public.sync_profile_on_incharge_change()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.email IS NOT NULL AND trim(NEW.email) <> '' THEN
    SELECT id INTO v_user_id
      FROM auth.users
     WHERE lower(trim(email)) = lower(trim(NEW.email))
     LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.profiles (id, role, name, ref_id, college_id)
      VALUES (v_user_id, 'incharge', NEW.name, NEW.id, NULL)
      ON CONFLICT (id) DO UPDATE
      SET role = 'incharge',
          ref_id = EXCLUDED.ref_id,
          name = EXCLUDED.name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_on_incharge_change ON public.incharges;
CREATE TRIGGER trg_sync_profile_on_incharge_change
  AFTER INSERT OR UPDATE ON public.incharges
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_on_incharge_change();

-- SECURITY DEFINER RPC to pre-register a leader profile bypassing auth check
CREATE OR REPLACE FUNCTION public.pre_register_leader(
  p_leader_name  text,
  p_email        text,
  p_phone        text,
  p_department   text,
  p_college_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_college_id uuid;
  v_leader_id uuid;
BEGIN
  -- 1. Find or create college
  SELECT id INTO v_college_id
    FROM public.colleges
   WHERE lower(trim(college)) = lower(trim(p_college_name))
     AND lower(trim(department)) = lower(trim(p_department))
   LIMIT 1;

  IF v_college_id IS NULL THEN
    INSERT INTO public.colleges (college, department, status)
    VALUES (p_college_name, p_department, 'active')
    RETURNING id INTO v_college_id;
  END IF;

  -- 2. Check if a student leader is already registered for this college department
  SELECT id INTO v_leader_id
    FROM public.student_leaders
   WHERE college_id = v_college_id
     AND status = 'active'
   LIMIT 1;

  IF v_leader_id IS NOT NULL THEN
    RAISE EXCEPTION 'A student leader has already been registered for this college and department.';
  END IF;

  -- 3. Check if email is already registered
  SELECT id INTO v_leader_id
    FROM public.student_leaders
   WHERE lower(trim(email)) = lower(trim(p_email))
     AND status = 'active'
   LIMIT 1;

  IF v_leader_id IS NOT NULL THEN
    RAISE EXCEPTION 'This email is already registered as a student leader.';
  END IF;

  -- 4. Insert student leader
  INSERT INTO public.student_leaders (name, phone, email, department, college_id, status)
  VALUES (p_leader_name, p_phone, p_email, p_department, v_college_id, 'active')
  RETURNING id INTO v_leader_id;

  RETURN v_leader_id;
END;
$$;

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
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found in authentication catalog.';
  END IF;

  SELECT id INTO v_college_id
    FROM public.colleges
   WHERE lower(trim(college)) = lower(trim(p_college_name))
     AND lower(trim(department)) = lower(trim(p_leader_dept))
   LIMIT 1;

  IF v_college_id IS NULL THEN
    INSERT INTO public.colleges (college, department, status)
    VALUES (p_college_name, p_leader_dept, 'active')
    RETURNING id INTO v_college_id;
  END IF;

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

  INSERT INTO public.profiles (id, role, name, ref_id, college_id)
  VALUES (p_user_id, 'leader', p_leader_name, v_leader_id, v_college_id)
  ON CONFLICT (id) DO UPDATE
  SET ref_id = EXCLUDED.ref_id,
      college_id = EXCLUDED.college_id,
      name = EXCLUDED.name,
      role = EXCLUDED.role;

  RETURN jsonb_build_object(
    'college_id', v_college_id,
    'leader_id', v_leader_id
  );
END;
$$;

-- SECURITY DEFINER RPC to update food counts bypassing registrations RLS
CREATE OR REPLACE FUNCTION public.update_registration_food_count(
  p_registration_id uuid,
  p_veg_count       int,
  p_nonveg_count    int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.registrations
     SET veg_count = p_veg_count,
         nonveg_count = p_nonveg_count
   WHERE id = p_registration_id;
END;
$$;

-- 3f-1. verify_payment_desk_key -- authenticate a payment poll keycode
-- Returns the matching payment_polls row or NULL if invalid
DROP FUNCTION IF EXISTS public.verify_payment_desk_key(text);
CREATE OR REPLACE FUNCTION public.verify_payment_desk_key(p_keycode text)
RETURNS public.payment_polls
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_poll public.payment_polls;
BEGIN
  -- Enforce that only 'admin' or 'accountant' role can verify the key
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
     WHERE id = auth.uid() 
       AND role IN ('admin', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only admins and accountants can verify payment desk keys.';
  END IF;

  SELECT * INTO v_poll
    FROM public.payment_polls
   WHERE upper(trim(poll_key)) = upper(trim(p_keycode))
   LIMIT 1;
  RETURN v_poll;
END;
$$;

-- 3f-2. clear_college_payment_with_key -- atomically mark a college as paid/unpaid
-- Updates colleges.is_paid and colleges.paid_student_count
-- Inserts a payment_logs audit row with amount and students count
-- Advances all registrations for that college to 'paid' status (when marking as PAID)
DROP FUNCTION IF EXISTS public.clear_college_payment_with_key(uuid, text, boolean);
CREATE OR REPLACE FUNCTION public.clear_college_payment_with_key(
  p_college_id uuid,
  p_keycode    text,
  p_is_paid    boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_poll             public.payment_polls;
  v_college          public.colleges;
  v_cname            text;
  v_current_students int;
  v_new_students     int;
  v_amt              numeric;
BEGIN
  -- Enforce that only 'admin' or 'accountant' role can perform this operation
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
     WHERE id = auth.uid() 
       AND role IN ('admin', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only admins and accountants can clear college payments.';
  END IF;

  -- 1. Verify the poll keycode
  SELECT * INTO v_poll
    FROM public.payment_polls
   WHERE upper(trim(poll_key)) = upper(trim(p_keycode))
   LIMIT 1;

  IF v_poll IS NULL THEN
    RAISE EXCEPTION 'Invalid payment poll key.';
  END IF;

  -- 2. Fetch college row
  SELECT * INTO v_college
    FROM public.colleges
   WHERE id = p_college_id;

  IF v_college IS NULL THEN
    RAISE EXCEPTION 'College not found.';
  END IF;

  -- 3. Build display name
  IF v_college.department IS NOT NULL AND trim(v_college.department) <> '' THEN
    v_cname := v_college.college || ' (' || v_college.department || ')';
  ELSE
    v_cname := v_college.college;
  END IF;

  -- Count currently registered students
  SELECT count(*) INTO v_current_students
    FROM public.students
   WHERE college_id = p_college_id;

  -- 5. If marking as PAID:
  IF p_is_paid THEN
    v_new_students := v_current_students - v_college.paid_student_count;
    
    -- Only log and count if there are actual unpaid students
    IF v_new_students > 0 THEN
      v_amt := v_new_students * 236; -- Rs. 200 + 18% GST = 236
      
      INSERT INTO public.payment_logs (poll_id, poll_name, college_name, amount, students_count)
      VALUES (v_poll.id, v_poll.poll_name, v_cname, v_amt, v_new_students);
    END IF;

    UPDATE public.colleges
       SET is_paid = true,
           paid_student_count = v_current_students
     WHERE id = p_college_id;

    UPDATE public.registrations
       SET status = 'paid'
     WHERE college_id = p_college_id
       AND status = 'lot_assigned';
  ELSE
    -- If marking as UNPAID: reset both paid_student_count and is_paid
    UPDATE public.colleges
       SET is_paid = false,
           paid_student_count = 0
     WHERE id = p_college_id;

    -- Roll registrations back from 'paid' to 'lot_assigned'
    UPDATE public.registrations
       SET status = 'lot_assigned'
     WHERE college_id = p_college_id
       AND status = 'paid';
  END IF;
END;
$$;

-- Trigger to automatically set is_paid = false when students count exceeds paid_student_count
CREATE OR REPLACE FUNCTION public.check_incremental_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_current_count int;
  v_paid_count int;
  v_col_id uuid;
BEGIN
  v_col_id := COALESCE(NEW.college_id, OLD.college_id);

  -- Fetch current count of students for this college
  SELECT count(*) INTO v_current_count 
    FROM public.students 
   WHERE college_id = v_col_id;

  -- Fetch how many students have been paid for
  SELECT paid_student_count INTO v_paid_count 
    FROM public.colleges 
   WHERE id = v_col_id;

  -- If we have more students than paid for, set is_paid to false
  IF v_current_count > v_paid_count THEN
    UPDATE public.colleges 
       SET is_paid = false 
     WHERE id = v_col_id;
  ELSE
    -- If students count is less than or equal to paid_student_count, mark as paid
    UPDATE public.colleges 
       SET is_paid = true 
     WHERE id = v_col_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_incremental_payment_status ON public.students;
CREATE TRIGGER trg_check_incremental_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.check_incremental_payment_status();

-- 3f. register_guest_team RPC function
DROP FUNCTION IF EXISTS public.register_guest_team(text,text,text,text,text,text,text,text,text,integer,integer,jsonb);
CREATE OR REPLACE FUNCTION public.register_guest_team(
  p_leader_name     text,
  p_email           text,
  p_phone           text,
  p_department      text,
  p_college_name    text,
  p_college_dept    text,
  p_college_phone   text,
  p_college_email   text,
  p_college_address text,
  p_veg_count       int,
  p_nonveg_count    int,
  p_registrations   jsonb
) RETURNS TABLE (out_leader_id uuid, out_college_id uuid)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_college_id   uuid;
  v_leader_id    uuid;
  v_reg_item     jsonb;
  v_event_id     uuid;
  v_participants jsonb;
  v_reg_id       uuid;
BEGIN
  SELECT id INTO v_college_id FROM public.colleges
   WHERE lower(trim(college)) = lower(trim(p_college_name))
     AND lower(trim(department)) = lower(trim(p_college_dept)) LIMIT 1;

  IF v_college_id IS NULL THEN
    INSERT INTO public.colleges (college, department, phone, email, address, status)
    VALUES (p_college_name, p_college_dept, p_college_phone, p_college_email, p_college_address, 'active')
    RETURNING id INTO v_college_id;
  END IF;

  SELECT id INTO v_leader_id FROM public.student_leaders
   WHERE lower(trim(email)) = lower(trim(p_email)) AND college_id = v_college_id LIMIT 1;

  IF v_leader_id IS NULL THEN
    INSERT INTO public.student_leaders (name, phone, email, department, college_id, status)
    VALUES (p_leader_name, p_phone, p_email, p_department, v_college_id, 'active')
    RETURNING id INTO v_leader_id;
  END IF;

  FOR v_reg_item IN SELECT * FROM jsonb_array_elements(p_registrations) LOOP
    v_event_id     := (v_reg_item->>'eventId')::uuid;
    v_participants := v_reg_item->'participants';
    v_reg_id       := public.register_team(v_college_id, v_leader_id, v_event_id, v_participants);

    UPDATE public.registrations
       SET veg_count    = p_veg_count,
           nonveg_count = p_nonveg_count
     WHERE id = v_reg_id;
  END LOOP;

  out_leader_id := v_leader_id;
  out_college_id := v_college_id;
  RETURN NEXT;
END;
$$;

-- 3g. create_leader_profile helper
CREATE OR REPLACE FUNCTION public.create_leader_profile(
  p_user_id    uuid,
  p_ref_id     uuid,
  p_college_id uuid,
  p_name       text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, ref_id, college_id)
  VALUES (p_user_id, 'leader', p_name, p_ref_id, p_college_id)
  ON CONFLICT (id) DO NOTHING;
END;
$$;


-- ============================================================================
-- PHASE 4: Row Level Security Policies (Production-Hardened)
-- ============================================================================
-- Design principles:
--   anon   = unauthenticated browser visitor (Supabase anon key)
--   Public website tables (settings, leaders, rules, venues, events, lots,
--   winners) allow anon SELECT only.
--   Private tables (admins, accountants, profiles, incharges, students,
--   registrations, certificates, payments, payment_logs) require sign-in.
--   All writes (INSERT/UPDATE/DELETE) require role = 'admin' via
--   current_role_name(), except where SECURITY DEFINER RPCs bypass RLS.
--   colleges and student_leaders: authenticated read only; SECURITY DEFINER
--   RPCs handle writes during registration workflow.
-- ============================================================================

-- settings: anon can read. Admin can write.
DROP POLICY IF EXISTS "settings: public read"  ON public.settings;
DROP POLICY IF EXISTS "settings: admin write"  ON public.settings;
CREATE POLICY "settings: public read"
  ON public.settings FOR SELECT
  USING (true);
CREATE POLICY "settings: admin write"
  ON public.settings FOR ALL
  USING (current_role_name() = 'admin');

-- leaders: anon can read. Admin can write.
DROP POLICY IF EXISTS "leaders: public read"  ON public.leaders;
DROP POLICY IF EXISTS "leaders: admin write"  ON public.leaders;
CREATE POLICY "leaders: public read"
  ON public.leaders FOR SELECT
  USING (true);
CREATE POLICY "leaders: admin write"
  ON public.leaders FOR ALL
  USING (current_role_name() = 'admin');

-- rules: anon can read. Admin can write.
DROP POLICY IF EXISTS "rules: public read"  ON public.rules;
DROP POLICY IF EXISTS "rules: admin write"  ON public.rules;
CREATE POLICY "rules: public read"
  ON public.rules FOR SELECT
  USING (true);
CREATE POLICY "rules: admin write"
  ON public.rules FOR ALL
  USING (current_role_name() = 'admin');

-- venues: anon can read. Admin can write.
DROP POLICY IF EXISTS "venues: public read"  ON public.venues;
DROP POLICY IF EXISTS "venues: admin write"  ON public.venues;
CREATE POLICY "venues: public read"
  ON public.venues FOR SELECT
  USING (true);
CREATE POLICY "venues: admin write"
  ON public.venues FOR ALL
  USING (current_role_name() = 'admin');

-- events: anon can read. Admin can write.
DROP POLICY IF EXISTS "events: public read"  ON public.events;
DROP POLICY IF EXISTS "events: admin write"  ON public.events;
CREATE POLICY "events: public read"
  ON public.events FOR SELECT
  USING (true);
CREATE POLICY "events: admin write"
  ON public.events FOR ALL
  USING (current_role_name() = 'admin');

-- lots: anon can read (lot assignments are public-facing).
-- Admin can write. SECURITY DEFINER triggers handle automatic lot assignment.
DROP POLICY IF EXISTS "lots: public read"  ON public.lots;
DROP POLICY IF EXISTS "lots: admin write"  ON public.lots;
CREATE POLICY "lots: public read"
  ON public.lots FOR SELECT
  USING (true);
CREATE POLICY "lots: admin write"
  ON public.lots FOR ALL
  USING (current_role_name() = 'admin');

-- winners: anon can read. Admin can write.
DROP POLICY IF EXISTS "winners: public read"  ON public.winners;
DROP POLICY IF EXISTS "winners: admin write"  ON public.winners;
DROP POLICY IF EXISTS "winners: incharge write" ON public.winners;
CREATE POLICY "winners: public read"
  ON public.winners FOR SELECT
  USING (true);
CREATE POLICY "winners: admin write"
  ON public.winners FOR ALL
  USING (current_role_name() = 'admin');
CREATE POLICY "winners: incharge write"
  ON public.winners FOR ALL
  USING (
    current_role_name() = 'incharge' AND (
      event_id IN (
        SELECT id FROM public.events WHERE staff_incharge::text = (
          SELECT ref_id::text FROM public.profiles WHERE id = auth.uid()
        )
      )
      OR
      event_id IN (
        SELECT event_id FROM public.incharges WHERE id = (
          SELECT ref_id FROM public.profiles WHERE id = auth.uid()
        ) AND event_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
    current_role_name() = 'incharge' AND (
      event_id IN (
        SELECT id FROM public.events WHERE staff_incharge::text = (
          SELECT ref_id::text FROM public.profiles WHERE id = auth.uid()
        )
      )
      OR
      event_id IN (
        SELECT event_id FROM public.incharges WHERE id = (
          SELECT ref_id FROM public.profiles WHERE id = auth.uid()
        ) AND event_id IS NOT NULL
      )
    )
  );

-- profiles: each authenticated user can read only their own row. Admin reads all.
DROP POLICY IF EXISTS "profiles: own read"    ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin write" ON public.profiles;
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR current_role_name() = 'admin');
CREATE POLICY "profiles: admin write"
  ON public.profiles FOR ALL
  USING (current_role_name() = 'admin');

-- admins: admin-only read and write. No public or anon access.
DROP POLICY IF EXISTS "admins: admin read"  ON public.admins;
DROP POLICY IF EXISTS "admins: admin write" ON public.admins;
CREATE POLICY "admins: admin read"
  ON public.admins FOR SELECT
  USING (current_role_name() = 'admin');
CREATE POLICY "admins: admin write"
  ON public.admins FOR ALL
  USING (current_role_name() = 'admin');

-- accountants: authenticated users can read (needed for login lookup). Admin writes.
DROP POLICY IF EXISTS "accountants: signed-in read" ON public.accountants;
DROP POLICY IF EXISTS "accountants: admin write"    ON public.accountants;
CREATE POLICY "accountants: signed-in read"
  ON public.accountants FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "accountants: admin write"
  ON public.accountants FOR ALL
  USING (current_role_name() = 'admin');

-- incharges: authenticated users can read (needed for login lookup and workflow). Admin writes.
DROP POLICY IF EXISTS "incharges: signed-in read" ON public.incharges;
DROP POLICY IF EXISTS "incharges: admin write"    ON public.incharges;
CREATE POLICY "incharges: signed-in read"
  ON public.incharges FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "incharges: admin write"
  ON public.incharges FOR ALL
  USING (current_role_name() = 'admin');

-- colleges: authenticated read only (contains PII: email, phone, address).
-- Admin full write. Payment-desk UPDATE via SECURITY DEFINER RPC only.
DROP POLICY IF EXISTS "colleges: public read"    ON public.colleges;
DROP POLICY IF EXISTS "colleges: signed-in read" ON public.colleges;
DROP POLICY IF EXISTS "colleges: admin write"    ON public.colleges;
DROP POLICY IF EXISTS "colleges: payment update" ON public.colleges;
CREATE POLICY "colleges: signed-in read"
  ON public.colleges FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "colleges: admin write"
  ON public.colleges FOR ALL
  USING (current_role_name() = 'admin');

-- student_leaders: authenticated read only. Admin full write.
-- Inserts via SECURITY DEFINER RPCs only (pre_register_leader, configure_leader_profile).
DROP POLICY IF EXISTS "student_leaders: public read"    ON public.student_leaders;
DROP POLICY IF EXISTS "student_leaders: signed-in read" ON public.student_leaders;
DROP POLICY IF EXISTS "student_leaders: admin write"    ON public.student_leaders;
CREATE POLICY "student_leaders: signed-in read"
  ON public.student_leaders FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "student_leaders: admin write"
  ON public.student_leaders FOR ALL
  USING (current_role_name() = 'admin');

-- registrations: authenticated users with valid role can read.
-- Leaders can read only their own college's registrations.
-- Admin full access. Writes via SECURITY DEFINER RPC (register_team) only.
DROP POLICY IF EXISTS "registrations: public read"  ON public.registrations;
DROP POLICY IF EXISTS "registrations: leader read"  ON public.registrations;
DROP POLICY IF EXISTS "registrations: role read"    ON public.registrations;
DROP POLICY IF EXISTS "registrations: admin write"  ON public.registrations;
CREATE POLICY "registrations: role read"
  ON public.registrations FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      current_role_name() = 'admin'
      OR current_role_name() = 'accountant'
      OR current_role_name() = 'incharge'
      OR (
        current_role_name() = 'leader' AND
        college_id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );
CREATE POLICY "registrations: admin write"
  ON public.registrations FOR ALL
  USING (current_role_name() = 'admin');

-- students: authenticated users with valid role can read.
-- Leaders read only their college's students. Incharge can update winner_place.
-- Admin full access. Inserts via SECURITY DEFINER RPC only.
DROP POLICY IF EXISTS "students: public read"                  ON public.students;
DROP POLICY IF EXISTS "students: leader read"                  ON public.students;
DROP POLICY IF EXISTS "students: role read"                    ON public.students;
DROP POLICY IF EXISTS "students: admin write"                  ON public.students;
DROP POLICY IF EXISTS "students: incharge update winner_place" ON public.students;
CREATE POLICY "students: role read"
  ON public.students FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      current_role_name() = 'admin'
      OR current_role_name() = 'accountant'
      OR current_role_name() = 'incharge'
      OR (
        current_role_name() = 'leader' AND
        college_id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );
CREATE POLICY "students: admin write"
  ON public.students FOR ALL
  USING (current_role_name() = 'admin');
CREATE POLICY "students: incharge update winner_place"
  ON public.students FOR UPDATE
  USING (
    current_role_name() = 'incharge' AND (
      event_id IN (
        SELECT id FROM public.events WHERE staff_incharge::text = (
          SELECT ref_id::text FROM public.profiles WHERE id = auth.uid()
        )
      )
      OR
      event_id IN (
        SELECT event_id FROM public.incharges WHERE id = (
          SELECT ref_id FROM public.profiles WHERE id = auth.uid()
        ) AND event_id IS NOT NULL
      )
    )
  );

-- certificates: authenticated users can read. Admin can write.
DROP POLICY IF EXISTS "certificates: admin read"      ON public.certificates;
DROP POLICY IF EXISTS "certificates: signed-in read"  ON public.certificates;
DROP POLICY IF EXISTS "certificates: admin write"     ON public.certificates;
CREATE POLICY "certificates: signed-in read"
  ON public.certificates FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "certificates: admin write"
  ON public.certificates FOR ALL
  USING (current_role_name() = 'admin');

-- payments: authenticated users can read. Admin can write.
DROP POLICY IF EXISTS "payments: admin read"     ON public.payments;
DROP POLICY IF EXISTS "payments: signed-in read" ON public.payments;
DROP POLICY IF EXISTS "payments: admin write"    ON public.payments;
CREATE POLICY "payments: signed-in read"
  ON public.payments FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "payments: admin write"
  ON public.payments FOR ALL
  USING (current_role_name() = 'admin');

-- payment_polls: authenticated read only.
-- Payment desk uses verify_payment_desk_key SECURITY DEFINER RPC to authenticate.
DROP POLICY IF EXISTS "payment_polls: public read"  ON public.payment_polls;
DROP POLICY IF EXISTS "payment_polls: signed-in read" ON public.payment_polls;
DROP POLICY IF EXISTS "payment_polls: admin write"  ON public.payment_polls;
CREATE POLICY "payment_polls: signed-in read"
  ON public.payment_polls FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "payment_polls: admin write"
  ON public.payment_polls FOR ALL
  USING (current_role_name() = 'admin');

-- payment_logs: authenticated users can read. Admin can write.
-- Inserts happen via SECURITY DEFINER RPC (clear_college_payment_with_key).
DROP POLICY IF EXISTS "payment_logs: public insert" ON public.payment_logs;
DROP POLICY IF EXISTS "payment_logs: admin read"    ON public.payment_logs;
DROP POLICY IF EXISTS "payment_logs: signed-in read" ON public.payment_logs;
DROP POLICY IF EXISTS "payment_logs: admin write"   ON public.payment_logs;
CREATE POLICY "payment_logs: signed-in read"
  ON public.payment_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "payment_logs: admin write"
  ON public.payment_logs FOR ALL
  USING (current_role_name() = 'admin');

-- feedbacks: leader write & read, admin write
DROP POLICY IF EXISTS "feedbacks: leader write" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks: leader read"  ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks: admin write"   ON public.feedbacks;
CREATE POLICY "feedbacks: leader write"
  ON public.feedbacks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "feedbacks: leader read"
  ON public.feedbacks FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "feedbacks: admin write"
  ON public.feedbacks FOR ALL
  USING (current_role_name() = 'admin');


-- ============================================================================
-- PHASE 5: Enable Realtime Broadcasting
-- ============================================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.leaders;         EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rules;           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;          EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events;          EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.colleges;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.student_leaders; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lots;            EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;   EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.students;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_polls;   EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_logs;    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.winners;         EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.incharges;       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks;       EXCEPTION WHEN others THEN NULL; END $$;


