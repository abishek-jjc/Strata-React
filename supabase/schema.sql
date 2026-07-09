-- ============================================================================
-- STRATA 2K26 — Unified Database Schema, Migration & Seed Script
-- Run this in your Supabase SQL Editor: https://supabase.com
-- ============================================================================

-- ============================================================================
-- PHASE 0: Clean existing transactional data if tables exist
-- ============================================================================
DO $$
BEGIN
  -- Disable FK checks temporarily for clean cascaded truncation
  SET session_replication_role = 'replica';

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'certificates') THEN
    TRUNCATE TABLE public.certificates CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    TRUNCATE TABLE public.payments CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_logs') THEN
    TRUNCATE TABLE public.payment_logs CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_polls') THEN
    TRUNCATE TABLE public.payment_polls CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    TRUNCATE TABLE public.students CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'registrations') THEN
    TRUNCATE TABLE public.registrations CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_leaders') THEN
    TRUNCATE TABLE public.student_leaders CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'winners') THEN
    TRUNCATE TABLE public.winners CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lots') THEN
    TRUNCATE TABLE public.lots CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'colleges') THEN
    TRUNCATE TABLE public.colleges CASCADE;
  END IF;

  -- Safe reset profiles (keep admins)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    DELETE FROM public.profiles WHERE role <> 'admin';
  END IF;

  -- Restore normal trigger behaviour
  SET session_replication_role = 'origin';
END $$;


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
  description text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaders ADD COLUMN IF NOT EXISTS image_url text;

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

-- Enforce max 1 leader per college per department
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'student_leaders_college_id_key'
      AND table_name = 'student_leaders'
  ) THEN
    ALTER TABLE public.student_leaders DROP CONSTRAINT student_leaders_college_id_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'student_leaders_college_id_dept_key'
      AND table_name = 'student_leaders'
  ) THEN
    ALTER TABLE public.student_leaders
      ADD CONSTRAINT student_leaders_college_id_dept_key UNIQUE (college_id, department);
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
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS food_type               text CHECK (food_type IN ('Veg', 'Non-Veg'));
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS registration_id         uuid REFERENCES public.registrations(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS leader_id               uuid REFERENCES public.student_leaders(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS college_id              uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS event_id                uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS certificate_status      text NOT NULL DEFAULT 'not issued';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS winner_place            text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS winning_prize           text;

-- 2o. certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid        REFERENCES public.students(id) ON DELETE CASCADE,
  event_id           uuid        REFERENCES public.events(id) ON DELETE CASCADE,
  certificate_number text,
  position           text,
  cert_type          text,
  issued_at          timestamptz DEFAULT now()
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

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

-- 2s. winners
CREATE TABLE IF NOT EXISTS public.winners (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid        REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
  first_place  text        DEFAULT '-',
  second_place text        DEFAULT '-',
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;


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

-- Trigger helper to sync registration food counts automatically from students table
CREATE OR REPLACE FUNCTION public.sync_registration_food_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_reg_id uuid;
  v_veg int;
  v_nonveg int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_reg_id := OLD.registration_id;
  ELSE
    v_reg_id := NEW.registration_id;
  END IF;

  IF v_reg_id IS NOT NULL THEN
    SELECT count(*) FILTER (WHERE food_type = 'Veg'),
           count(*) FILTER (WHERE food_type = 'Non-Veg')
      INTO v_veg, v_nonveg
      FROM public.students
     WHERE registration_id = v_reg_id;

    UPDATE public.registrations
       SET veg_count = coalesce(v_veg, 0),
           nonveg_count = coalesce(v_nonveg, 0)
     WHERE id = v_reg_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_registration_food_counts ON public.students;
CREATE TRIGGER trg_sync_registration_food_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.sync_registration_food_counts();

-- 3b. Sync winning prizes (trigger helper)
CREATE OR REPLACE FUNCTION public.sync_winning_prizes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_first_college     text;
  v_second_college    text;
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
      student_name, student_name_normalized, roll_no, food_type,
      gender, department, year,
      registration_id, leader_id, college_id, event_id, certificate_status
    ) VALUES (
      v_participant->>'studentName',
      lower(trim(v_participant->>'studentName')),
      v_participant->>'rollNo',
      coalesce(v_participant->>'foodType', 'Veg'),
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
  -- Strict identity authorization check
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized profile configuration request.';
  END IF;

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
  -- Verify caller is admin OR is the specific leader associated with this registration
  IF NOT (
    public.current_role_name() = 'admin' OR
    EXISTS (
      SELECT 1 FROM public.registrations r
       WHERE r.id = p_registration_id
         AND r.leader_id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized registration update request.';
  END IF;

  UPDATE public.registrations
     SET veg_count = p_veg_count,
         nonveg_count = p_nonveg_count
   WHERE id = p_registration_id;
END;
$$;

-- SECURITY DEFINER RPC to verify payment poll desk keys securely without exposing keys
CREATE OR REPLACE FUNCTION public.verify_payment_desk_key(
  p_keycode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poll_id uuid;
  v_poll_name text;
BEGIN
  SELECT id, poll_name INTO v_poll_id, v_poll_name
    FROM public.payment_polls
   WHERE upper(trim(poll_key)) = upper(trim(p_keycode))
   LIMIT 1;

  IF v_poll_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_poll_id,
    'poll_name', v_poll_name
  );
END;
$$;

-- SECURITY DEFINER RPC to clear college payment and insert log in a single transaction
CREATE OR REPLACE FUNCTION public.clear_college_payment_with_key(
  p_college_id uuid,
  p_keycode    text,
  p_is_paid    boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poll_id uuid;
  v_poll_name text;
  v_college_name text;
BEGIN
  -- Verify operator desk key code
  SELECT id, poll_name INTO v_poll_id, v_poll_name
    FROM public.payment_polls
   WHERE upper(trim(poll_key)) = upper(trim(p_keycode))
   LIMIT 1;

  IF v_poll_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized payment operator desk keycode.';
  END IF;

  -- Get college name for logging
  SELECT case when department is not null and trim(department) <> '' then college || ' (' || department || ')' else college end INTO v_college_name FROM public.colleges WHERE id = p_college_id;
  IF v_college_name IS NULL THEN
    RAISE EXCEPTION 'College not found.';
  END IF;

  -- 1. Update college status to paid
  UPDATE public.colleges
     SET is_paid = p_is_paid
   WHERE id = p_college_id;

  -- 2. Insert trace log in payment_logs if marked as paid
  IF p_is_paid THEN
    INSERT INTO public.payment_logs (poll_id, poll_name, college_name)
    VALUES (v_poll_id, v_poll_name, v_college_name);
  END IF;
END;
$$;

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
     AND lower(trim(department)) = lower(trim(p_college_dept))
   LIMIT 1;

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
-- PHASE 4: Row Level Security Policies
-- ============================================================================

DROP POLICY IF EXISTS "settings: public read"  ON public.settings;
DROP POLICY IF EXISTS "settings: admin write"  ON public.settings;
CREATE POLICY "settings: public read"  ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings: admin write"  ON public.settings FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "leaders: public read"   ON public.leaders;
DROP POLICY IF EXISTS "leaders: admin write"   ON public.leaders;
CREATE POLICY "leaders: public read"   ON public.leaders FOR SELECT USING (true);
CREATE POLICY "leaders: admin write"   ON public.leaders FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "rules: public read"     ON public.rules;
DROP POLICY IF EXISTS "rules: admin write"     ON public.rules;
CREATE POLICY "rules: public read"     ON public.rules FOR SELECT USING (true);
CREATE POLICY "rules: admin write"     ON public.rules FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "venues: public read"    ON public.venues;
DROP POLICY IF EXISTS "venues: admin write"    ON public.venues;
CREATE POLICY "venues: public read"    ON public.venues FOR SELECT USING (true);
CREATE POLICY "venues: admin write"    ON public.venues FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "events: public read"    ON public.events;
DROP POLICY IF EXISTS "events: admin write"    ON public.events;
CREATE POLICY "events: public read"    ON public.events FOR SELECT USING (true);
CREATE POLICY "events: admin write"    ON public.events FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "profiles: own read"     ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin write"  ON public.profiles;
CREATE POLICY "profiles: own read"     ON public.profiles FOR SELECT USING (auth.uid() = id OR current_role_name() = 'admin');
CREATE POLICY "profiles: admin write"  ON public.profiles FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "admins: admin read"     ON public.admins;
DROP POLICY IF EXISTS "admins: admin write"    ON public.admins;
CREATE POLICY "admins: admin write"    ON public.admins FOR ALL USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "accountants: signed-in read" ON public.accountants;
DROP POLICY IF EXISTS "accountants: admin write"    ON public.accountants;
CREATE POLICY "accountants: signed-in read" ON public.accountants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "accountants: admin write"    ON public.accountants FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "incharges: signed-in read"  ON public.incharges;
DROP POLICY IF EXISTS "incharges: admin write"     ON public.incharges;
CREATE POLICY "incharges: signed-in read"  ON public.incharges FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "incharges: admin write"     ON public.incharges FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "colleges: public read"      ON public.colleges;
DROP POLICY IF EXISTS "colleges: admin write"      ON public.colleges;
DROP POLICY IF EXISTS "colleges: payment update"   ON public.colleges;
CREATE POLICY "colleges: public read"      ON public.colleges FOR SELECT USING (true);
CREATE POLICY "colleges: admin write"      ON public.colleges FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "student_leaders: signed-in read" ON public.student_leaders;
DROP POLICY IF EXISTS "student_leaders: public read"    ON public.student_leaders;
DROP POLICY IF EXISTS "student_leaders: private read"   ON public.student_leaders;
DROP POLICY IF EXISTS "student_leaders: admin write"    ON public.student_leaders;
CREATE POLICY "student_leaders: private read"   ON public.student_leaders FOR SELECT
  USING (
    current_role_name() = 'admin' OR
    email = auth.jwt()->>'email' OR
    id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "student_leaders: admin write"    ON public.student_leaders FOR ALL
  USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "lots: public read"     ON public.lots;
DROP POLICY IF EXISTS "lots: admin write"     ON public.lots;
CREATE POLICY "lots: public read"     ON public.lots FOR SELECT USING (true);
CREATE POLICY "lots: admin write"     ON public.lots FOR ALL    USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "registrations: public read"   ON public.registrations;
DROP POLICY IF EXISTS "registrations: secure read"   ON public.registrations;
DROP POLICY IF EXISTS "registrations: admin write"   ON public.registrations;
CREATE POLICY "registrations: secure read"   ON public.registrations FOR SELECT
  USING (
    current_role_name() = 'admin' OR
    leader_id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid()) OR
    event_id IN (
      SELECT event_id FROM public.incharges WHERE id = (
        SELECT ref_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );
CREATE POLICY "registrations: admin write"   ON public.registrations FOR ALL
  USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "students: public read"                   ON public.students;
DROP POLICY IF EXISTS "students: secure read"                   ON public.students;
DROP POLICY IF EXISTS "students: admin write"                   ON public.students;
DROP POLICY IF EXISTS "students: leader update"                  ON public.students;
DROP POLICY IF EXISTS "students: incharge update winner_place"  ON public.students;
CREATE POLICY "students: secure read"   ON public.students FOR SELECT
  USING (
    current_role_name() = 'admin' OR
    leader_id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid()) OR
    event_id IN (
      SELECT event_id FROM public.incharges WHERE id = (
        SELECT ref_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );
CREATE POLICY "students: admin write"   ON public.students FOR ALL
  USING (current_role_name() = 'admin');
CREATE POLICY "students: leader update" ON public.students FOR UPDATE
  USING (
    leader_id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    leader_id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "students: incharge update winner_place" ON public.students FOR UPDATE
  USING (
    current_role_name() = 'incharge' AND
    event_id IN (
      SELECT event_id FROM public.incharges WHERE id = (
        SELECT ref_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "certificates: admin read"  ON public.certificates;
DROP POLICY IF EXISTS "certificates: secure read"  ON public.certificates;
DROP POLICY IF EXISTS "certificates: admin write" ON public.certificates;
CREATE POLICY "certificates: secure read"  ON public.certificates FOR SELECT
  USING (
    current_role_name() = 'admin' OR
    EXISTS (
      SELECT 1 FROM public.students s
       WHERE s.id = student_id
         AND s.leader_id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY "certificates: admin write" ON public.certificates FOR ALL
  USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "payments: admin read"   ON public.payments;
DROP POLICY IF EXISTS "payments: secure read"   ON public.payments;
DROP POLICY IF EXISTS "payments: admin write"  ON public.payments;
CREATE POLICY "payments: secure read"  ON public.payments FOR SELECT
  USING (
    current_role_name() = 'admin' OR
    college_id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "payments: admin write" ON public.payments FOR ALL
  USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "payment_polls: public read"  ON public.payment_polls;
DROP POLICY IF EXISTS "payment_polls: admin read"   ON public.payment_polls;
DROP POLICY IF EXISTS "payment_polls: admin write"  ON public.payment_polls;
CREATE POLICY "payment_polls: admin read"  ON public.payment_polls FOR SELECT
  USING (current_role_name() = 'admin');
CREATE POLICY "payment_polls: admin write"  ON public.payment_polls FOR ALL
  USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "payment_logs: public insert" ON public.payment_logs;
DROP POLICY IF EXISTS "payment_logs: admin read"    ON public.payment_logs;
CREATE POLICY "payment_logs: admin read"    ON public.payment_logs FOR SELECT
  USING (current_role_name() = 'admin');

DROP POLICY IF EXISTS "winners: public read"  ON public.winners;
DROP POLICY IF EXISTS "winners: admin write"  ON public.winners;
CREATE POLICY "winners: public read"  ON public.winners FOR SELECT USING (true);
CREATE POLICY "winners: admin write"  ON public.winners FOR ALL    USING (current_role_name() = 'admin');


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


-- ============================================================================
-- PHASE 6: Default Seed Data
-- ============================================================================

-- 6a. Default venues
DELETE FROM public.venues;
INSERT INTO public.venues (venue_name) VALUES
  ('Seminar Hall'),
  ('Auditorium'),
  ('C-9'),
  ('UG Lab'),
  ('E-Lab')
ON CONFLICT (venue_name) DO NOTHING;

-- 6b. Default page settings
INSERT INTO public.settings (key_name, value) VALUES
  ('event_date',              '2026-08-07 09:00:00'),
  ('invitation_title',        'You Are Cordially Invited'),
  ('invitation_tagline',      'STRATA 2K26 — State Level Intercollegiate Meet, ANJAC Sivakasi'),
  ('invitation_body',         'On behalf of the Department of Computer Science, Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi, we warmly invite you and your talented students to participate in STRATA 2K26 — our prestigious State Level Intercollegiate Meet.

The event features 8 exciting contests: Idea Presentation for Artificial Intelligence (AI), Frame Fusion, Mystery Chase, Code Detox, Mind Spark, Code Sprint, Syntax Wars, and Tech Premier League.

Date: 7 August 2026
Venue: ANJAC, Sivakasi
Registration Fee: Rs. 236 per participant (Including GST 18%)
Registration details can be mailed to anjacstrataofficial@gmail.com.

We warmly look forward to welcoming you and your participants to our campus.'),
  ('invitation_pdf_url',      ''),
  ('contact_email',           'anjacstrataofficial@gmail.com'),
  ('contact_phone',           '+91 9787970633, +91 7639535161'),
  ('contact_address',         'Department of Computer Science, Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi, Tamil Nadu, India.'),
  ('contact_extra',           'Head of Department: Mr. V. Venkateshbabu'),
  ('fee_per_student',         '236'),
  ('gpay_qr_url',             ''),
  ('whatsapp_group_link',     ''),
  ('participation_cert_url',  ''),
  ('winner_cert_1_url',       ''),
  ('winner_cert_2_url',       ''),
  ('about_us',                'Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi, established in 1963, in the industrial corporation of Sivakasi, popularly known as "Kutty Japan" in Tamil Nadu, is a pioneer in rural education and a recognized College of Excellence. STRATA 2K26 is our premier State-Level Intercollegiate Meet organized by the Department of Computer Science, aimed at fostering competitive excellence and innovation in computer technology.')
ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;

-- 6c. Default leaders (Principal + HOD messages)
DELETE FROM public.leaders;
INSERT INTO public.leaders (name, position, description) VALUES
  (
    'Dr. C. Ashok',
    'Principal',
    'Ayya Nadar Janaki Ammal College has always championed technical and creative integration. Fests like STRATA provide students the canvas they need to translate theoretical learning into practical mastery. I welcome all participants to engage, learn, and excel.'
  ),
  (
    'Mr. V. Venkateshbabu',
    'Head of Department',
    'Technology changes rapidly, and students must possess critical adaptability. STRATA 2K26 is curated to test that very agility. From AI presentations to debug syntax wars, we aim to prepare the next generation of IT leaders. Best of luck!'
  );

-- 6d. Default rules
DELETE FROM public.rules;
INSERT INTO public.rules (title, points) VALUES
  (
    'General Instructions',
    '1. Strata-2k26 is exclusively for UG & PG students of Computer based courses.
2. Maximum number of participants per team is 15.
3. It is the responsibility of the participants to avoid clashes between the events they are participating.
4. The decision of the judges will be final for all events.
5. Registration fee is 236/- per participant (Including GST 18% as per govt norms).'
  ),
  (
    'Registration & Certification',
    '6. Special Website is designed for Strata''26 (link is available in the website: anjacstrata.netlify.app).
7. Scan the QR code in the invitation with the scanner provided in the website and start registration online (Use the demo videos).
8. The Digital Certificates for the winners and participants can be downloaded from website after Valedictory Function.
9. Registration Details can be mailed to anjacstrataofficial@gmail.com.
10. Spot registration is also available.'
  );

-- 6e. Default events
DELETE FROM public.events;
INSERT INTO public.events (
  id, event_name, category, description, rules, staff_incharge,
  minimum_participants, maximum_participants, team_size,
  prelims_venue, mains_venue, preliminary, mains, status
)
SELECT
  e.id::uuid,
  e.event_name, e.category, e.description, e.rules, e.staff_incharge,
  e.min_p::int, e.max_p::int, e.team_sz::int,
  (SELECT id FROM public.venues WHERE venue_name = e.p_venue LIMIT 1),
  (SELECT id FROM public.venues WHERE venue_name = e.m_venue LIMIT 1),
  e.p_time::time,
  e.m_time::time,
  'active'
FROM (VALUES
  (
    '50000000-0000-0000-0000-000000000011',
    'Idea Presentation', 'Presentation',
    'Present innovative ideas on Artificial Intelligence (AI) and the future of technology.',
    E'Two participants per team.\nFive minutes for presentation and three minutes for queries.\nOriginal innovative ideas/projects can be presented.\nTopics may be from AI, RAG, MCP, Agentic AI, LLMs, GenAI, and robotics.\nNote: Submissions must reach cs-regular@anjaconline.org in ppt/pdf format on/before 05.08.2026.',
    'Mrs. S. Yogalakshmi', '2', '2', '2', 'Seminar Hall', 'Seminar Hall', '11:00', '11:00'
  ),(
    '50000000-0000-0000-0000-000000000012',
    'Frame Fusion', 'Short Film',
    'Showcase your cinematic and storytelling skills with an open theme short film.',
    E'The competition is based on an Open Theme.\nA maximum of 2 participants are allowed per team.\nThe duration of the short film must be between 3–4 minutes (including title and credits).\nThe completed short film must be submitted on or before 05/08/2026 in mp4/mkv/mov format to cs-regular@anjaconline.org.\nAny film containing vulgar, offensive, illegal, or unsafe content will be disqualified.',
    'Mrs. K. Shenbaga Priya', '1', '2', '2', 'Auditorium', 'Auditorium', '11:00', '11:00'
  ),(
    '50000000-0000-0000-0000-000000000013',
    'Mystery Chase', 'Treasure Hunt',
    'Clue-solving treasure hunt using QR codes placed around the campus.',
    E'Team Size: 3 Participants.\nPreliminary will be conducted. Two Participants from a team will be allowed to attend the prelims.\n10 teams will be selected to the next round.\nQR Codes will be placed at various locations. Each QR Code contains a clue or question.\nTeams must solve the clues and locate the next QR code.\nFirst five teams completing all clues qualify for the final round.',
    'Dr. V. Jayakumar', '3', '3', '3', 'UG Lab', 'C-9', '11:00', '12:00'
  ),(
    '50000000-0000-0000-0000-000000000014',
    'Code Detox', 'Model Making',
    'E-Waste Model Making: Craft innovative models using e-waste/raw materials.',
    E'Team Size: 2 Participants.\nParticipants should bring their own e-waste/raw materials.\nComponents should not be pre-assembled.\nAssembly should begin only after the event starts.\nTeams with pre-assembled components will be disqualified.\nTime duration: 1 hour.',
    'Dr. R. Vengateshkumar', '2', '2', '2', 'E-Lab', 'E-Lab', '11:30', '11:30'
  ),(
    '50000000-0000-0000-0000-000000000015',
    'Mind Spark', 'Technical Quiz',
    'Test your IT range, CS fundamentals, programming concepts, and current tech trends.',
    E'Two Participants per team.\nPreliminary will be conducted.\nTop five teams will qualify for the final round.\nQuestions will include Computer Science Fundamentals, Programming Concepts, and Current Technology Trends.',
    'Dr. A. Dharmarajan', '2', '2', '2', 'UG Lab', 'Seminar Hall', '11:00', '14:00'
  ),(
    '50000000-0000-0000-0000-000000000016',
    'Code Sprint', 'Coding',
    'Implement clean, optimized algorithms for spot problems under time limits.',
    E'One participant per team.\nPreliminary will be conducted.\nDuration is one hour.\nProblem will be given on the spot.\nSoftware can be used: C/Java/Python.',
    'Mrs. R. Ananthavalli', '1', '1', '1', 'UG Lab', 'UG Lab', '11:00', '12:00'
  ),(
    '50000000-0000-0000-0000-000000000017',
    'Syntax Wars', 'Debugging',
    'Identify and correct syntactic and logical errors in code files.',
    E'One participant per team.\nPreliminary will be conducted.\nIdentify and correct errors in the given programs.\nLanguages may include C, C++, Java, and Python.',
    'Mrs. K. Devikala', '1', '1', '1', 'UG Lab', 'UG Lab', '11:00', '12:00'
  ),(
    '50000000-0000-0000-0000-000000000018',
    'Tech Premier League', 'Sports Quiz',
    'An IPL-based quiz ending in a high-stakes mock auction.',
    E'Team Size: 2 Participants.\nPreliminary IPL Quiz round will be conducted.\nQuestions will be based on IPL.\nTop five teams will be selected for the final round (AUCTION).\nPrizes will be awarded to the Top Two Teams.',
    'Ms. R. Aishwarya Lakshmmi', '2', '2', '2', 'Auditorium', 'Auditorium', '11:30', '11:30'
  )
) AS e(id, event_name, category, description, rules, staff_incharge,
       min_p, max_p, team_sz, p_venue, m_venue, p_time, m_time)
ON CONFLICT (id) DO UPDATE SET
  event_name           = EXCLUDED.event_name,
  category             = EXCLUDED.category,
  description          = EXCLUDED.description,
  rules                = EXCLUDED.rules,
  staff_incharge       = EXCLUDED.staff_incharge,
  minimum_participants = EXCLUDED.minimum_participants,
  maximum_participants = EXCLUDED.maximum_participants,
  team_size            = EXCLUDED.team_size,
  prelims_venue        = EXCLUDED.prelims_venue,
  mains_venue          = EXCLUDED.mains_venue,
  preliminary          = EXCLUDED.preliminary,
  mains                = EXCLUDED.mains,
  status               = EXCLUDED.status;

-- 6f. Default lots (10 pre-created, all unassigned)
INSERT INTO public.lots (lot_name, is_assigned, assigned_college) VALUES
  ('Lot 1',  false, '-'),
  ('Lot 2',  false, '-'),
  ('Lot 3',  false, '-'),
  ('Lot 4',  false, '-'),
  ('Lot 5',  false, '-'),
  ('Lot 6',  false, '-'),
  ('Lot 7',  false, '-'),
  ('Lot 8',  false, '-'),
  ('Lot 9',  false, '-'),
  ('Lot 10', false, '-')
ON CONFLICT DO NOTHING;

-- 6g. Default incharges (static event links)
DELETE FROM public.incharges;
INSERT INTO public.incharges (id, name, email, event_id) VALUES
  ('60000000-0000-0000-0000-000000000011', 'Mrs. S. Yogalakshmi', 'yogalakshmi@anjaconline.org', '50000000-0000-0000-0000-000000000011'),
  ('60000000-0000-0000-0000-000000000012', 'Mrs. K. Shenbaga Priya', 'shenbagapriya@anjaconline.org', '50000000-0000-0000-0000-000000000012'),
  ('60000000-0000-0000-0000-000000000013', 'Dr. V. Jayakumar', 'jayakumar@anjaconline.org', '50000000-0000-0000-0000-000000000013'),
  ('60000000-0000-0000-0000-000000000014', 'Dr. R. Vengateshkumar', 'vengateshkumar@anjaconline.org', '50000000-0000-0000-0000-000000000014'),
  ('60000000-0000-0000-0000-000000000015', 'Dr. A. Dharmarajan', 'dharmarajan@anjaconline.org', '50000000-0000-0000-0000-000000000015'),
  ('60000000-0000-0000-0000-000000000016', 'Mrs. R. Ananthavalli', 'ananthavalli@anjaconline.org', '50000000-0000-0000-0000-000000000016'),
  ('60000000-0000-0000-0000-000000000017', 'Mrs. K. Devikala', 'devikala@anjaconline.org', '50000000-0000-0000-0000-000000000017'),
  ('60000000-0000-0000-0000-000000000018', 'Ms. R. Aishwarya Lakshmmi', 'aishwaryalakshmmi@anjaconline.org', '50000000-0000-0000-0000-000000000018')
ON CONFLICT (id) DO UPDATE SET
  name     = EXCLUDED.name,
  email    = EXCLUDED.email,
  event_id = EXCLUDED.event_id;

-- ============================================================================
-- 7. STORAGE BUCKET CONFIGURATION (assets bucket for media and templates)
-- ============================================================================

-- Create assets bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow anyone (anonymous and authenticated users) to download assets
DROP POLICY IF EXISTS "Public Download Assets" ON storage.objects;
CREATE POLICY "Public Download Assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'assets');

-- Policy to allow only admins to upload assets
DROP POLICY IF EXISTS "Public Upload Assets" ON storage.objects;
CREATE POLICY "Public Upload Assets" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (
    bucket_id = 'assets' AND
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- Policy to allow only admins to update assets
DROP POLICY IF EXISTS "Public Update Assets" ON storage.objects;
CREATE POLICY "Public Update Assets" ON storage.objects
  FOR UPDATE TO public
  USING (
    bucket_id = 'assets' AND
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'assets' AND
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- Policy to allow only admins to delete assets
DROP POLICY IF EXISTS "Public Delete Assets" ON storage.objects;
CREATE POLICY "Public Delete Assets" ON storage.objects
  FOR DELETE TO public
  USING (
    bucket_id = 'assets' AND
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
