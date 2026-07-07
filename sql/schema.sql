-- ============================================================================
-- STRATA 2K26 — Master Schema Script
-- Run this in Supabase SQL Editor: https://supabase.com
--
-- Behaviour:
--   • Fresh DB  — creates all tables, functions, triggers and seeds defaults
--   • Existing DB — safely ALTERs, adds columns, recreates functions/triggers
--   • Always clears: students, registrations, student_leaders, colleges,
--     payment_polls, payment_logs, winners, lots, auth users (non-admin)
--   • Preserves:  events, settings, leaders, rules, venues, admins, profiles (admin)
-- ============================================================================

-- ============================================================================
-- SECTION 0 — Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================================
-- SECTION 1 — Core lookup / config tables
--             (created idempotently; never truncated)
-- ============================================================================

-- 1a. settings
CREATE TABLE IF NOT EXISTS public.settings (
  key_name text PRIMARY KEY,
  value    text NOT NULL DEFAULT ''
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 1b. leaders  (Principal / HOD messages)
CREATE TABLE IF NOT EXISTS public.leaders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  position    text        NOT NULL,
  description text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;

-- 1c. rules
CREATE TABLE IF NOT EXISTS public.rules (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  points     text        NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- 1d. venues
CREATE TABLE IF NOT EXISTS public.venues (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 2 — Role/auth tables
-- ============================================================================

-- 2a. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text  NOT NULL CHECK (role IN ('admin','leader','accountant','incharge')),
  name       text,
  ref_id     uuid,
  college_id uuid
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Drop and recreate role constraint so re-runs are safe
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','leader','accountant','incharge'));

-- 2b. admins
CREATE TABLE IF NOT EXISTS public.admins (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 2c. accountants
CREATE TABLE IF NOT EXISTS public.accountants (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.accountants ENABLE ROW LEVEL SECURITY;

-- 2d. incharges
CREATE TABLE IF NOT EXISTS public.incharges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text,
  event_id   uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.incharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incharges ADD COLUMN IF NOT EXISTS email    text;


-- ============================================================================
-- SECTION 3 — Events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name           text        NOT NULL,
  category             text,
  description          text,
  rules                text,
  staff_incharge       text,
  team_size            int         NOT NULL DEFAULT 1,
  minimum_participants int         NOT NULL DEFAULT 1,
  maximum_participants int         NOT NULL DEFAULT 1,
  prelims_venue        uuid,
  mains_venue          uuid,
  preliminary          time,
  mains                time,
  status               text        NOT NULL DEFAULT 'active',
  created_at           timestamptz DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Safe column additions for existing DBs
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category             text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description          text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rules                text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS staff_incharge       text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS minimum_participants int  NOT NULL DEFAULT 1;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS maximum_participants int  NOT NULL DEFAULT 1;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS preliminary          time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mains                time;

-- Drop legacy columns that were replaced
DO $$
BEGIN
  ALTER TABLE public.events DROP COLUMN IF EXISTS prelims_date;
  ALTER TABLE public.events DROP COLUMN IF EXISTS mains_date;
  ALTER TABLE public.events DROP COLUMN IF EXISTS registration_fee;
  ALTER TABLE public.events DROP COLUMN IF EXISTS details;
  ALTER TABLE public.events DROP COLUMN IF EXISTS venue;
  ALTER TABLE public.events DROP COLUMN IF EXISTS winner_count;
  -- Recreate team_size as int if it was text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events'
      AND column_name = 'team_size' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.events DROP COLUMN team_size;
    ALTER TABLE public.events ADD  COLUMN team_size int NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add venue FK columns after venues table is guaranteed to exist
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS prelims_venue uuid REFERENCES public.venues(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mains_venue   uuid REFERENCES public.venues(id) ON DELETE SET NULL;

-- Add FK to incharges.event_id after events table is guaranteed to exist
ALTER TABLE public.incharges ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;


-- ============================================================================
-- SECTION 4 — College, Leader, Registration, Student tables
-- ============================================================================

-- 4a. colleges
CREATE TABLE IF NOT EXISTS public.colleges (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  college            text        NOT NULL,
  department         text,
  phone              text,
  email              text,
  address            text,
  status             text        NOT NULL DEFAULT 'active',
  is_paid            boolean     NOT NULL DEFAULT false,
  payment_screenshot text,
  qr_code            text,
  created_at         timestamptz DEFAULT now()
);
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
-- Safe additions for existing DBs
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS is_paid            boolean NOT NULL DEFAULT false;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS payment_screenshot text;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS qr_code            text;
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

-- 4b. student_leaders
CREATE TABLE IF NOT EXISTS public.student_leaders (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  phone      text,
  email      text,
  department text,
  college_id uuid        REFERENCES public.colleges(id) ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.student_leaders ENABLE ROW LEVEL SECURITY;
-- Enforce max 1 leader per college (idempotent)
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

-- 4c. lots
CREATE TABLE IF NOT EXISTS public.lots (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_name         text        NOT NULL,
  is_assigned      boolean     NOT NULL DEFAULT false,
  assigned_college text        NOT NULL DEFAULT '-',
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

-- 4d. registrations
CREATE TABLE IF NOT EXISTS public.registrations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id   uuid        REFERENCES public.colleges(id) ON DELETE CASCADE,
  leader_id    uuid        REFERENCES public.student_leaders(id) ON DELETE SET NULL,
  event_id     uuid        REFERENCES public.events(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','lot_assigned','paid','approved','rejected')),
  veg_count    int         NOT NULL DEFAULT 0,
  nonveg_count int         NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (college_id, event_id)
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS veg_count    int NOT NULL DEFAULT 0;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS nonveg_count int NOT NULL DEFAULT 0;

-- 4e. students
CREATE TABLE IF NOT EXISTS public.students (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name            text        NOT NULL,
  student_name_normalized text,
  gender                  text,
  department              text,
  year                    text,
  email                   text,
  registration_id         uuid        REFERENCES public.registrations(id) ON DELETE CASCADE,
  leader_id               uuid        REFERENCES public.student_leaders(id) ON DELETE SET NULL,
  college_id              uuid        REFERENCES public.colleges(id) ON DELETE CASCADE,
  event_id                uuid        REFERENCES public.events(id) ON DELETE CASCADE,
  certificate_status      text        NOT NULL DEFAULT 'not issued',
  winner_place            text,
  winning_prize           text,
  created_at              timestamptz DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email         text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS winner_place  text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS winning_prize text;

-- 4f. certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid        REFERENCES public.students(id) ON DELETE CASCADE,
  cert_type  text,
  issued_at  timestamptz DEFAULT now()
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 4g. payments (legacy — kept for compatibility)
CREATE TABLE IF NOT EXISTS public.payments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid        REFERENCES public.colleges(id) ON DELETE CASCADE,
  amount     numeric,
  paid_at    timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 5 — Payment poll & winner tables
-- ============================================================================

-- 5a. payment_polls
CREATE TABLE IF NOT EXISTS public.payment_polls (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_name  text        NOT NULL,
  poll_key   varchar(6)  NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payment_polls ENABLE ROW LEVEL SECURITY;

-- 5b. payment_logs
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      uuid        REFERENCES public.payment_polls(id) ON DELETE SET NULL,
  poll_name    text        NOT NULL,
  college_name text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- 5c. winners
CREATE TABLE IF NOT EXISTS public.winners (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid        REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
  first_place  text        DEFAULT '-',
  second_place text        DEFAULT '-',
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 6 — RLS Policies  (DROP IF EXISTS + CREATE for idempotency)
-- ============================================================================

-- settings
DROP POLICY IF EXISTS "settings: public read"  ON public.settings;
DROP POLICY IF EXISTS "settings: admin write"  ON public.settings;
CREATE POLICY "settings: public read"  ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings: admin write"  ON public.settings FOR ALL    USING (current_role_name() = 'admin');

-- leaders
DROP POLICY IF EXISTS "leaders: public read"   ON public.leaders;
DROP POLICY IF EXISTS "leaders: admin write"   ON public.leaders;
CREATE POLICY "leaders: public read"   ON public.leaders FOR SELECT USING (true);
CREATE POLICY "leaders: admin write"   ON public.leaders FOR ALL    USING (current_role_name() = 'admin');

-- rules
DROP POLICY IF EXISTS "rules: public read"     ON public.rules;
DROP POLICY IF EXISTS "rules: admin write"     ON public.rules;
CREATE POLICY "rules: public read"     ON public.rules FOR SELECT USING (true);
CREATE POLICY "rules: admin write"     ON public.rules FOR ALL    USING (current_role_name() = 'admin');

-- venues
DROP POLICY IF EXISTS "venues: public read"    ON public.venues;
DROP POLICY IF EXISTS "venues: admin write"    ON public.venues;
CREATE POLICY "venues: public read"    ON public.venues FOR SELECT USING (true);
CREATE POLICY "venues: admin write"    ON public.venues FOR ALL    USING (current_role_name() = 'admin');

-- events
DROP POLICY IF EXISTS "events: public read"    ON public.events;
DROP POLICY IF EXISTS "events: admin write"    ON public.events;
CREATE POLICY "events: public read"    ON public.events FOR SELECT USING (true);
CREATE POLICY "events: admin write"    ON public.events FOR ALL    USING (current_role_name() = 'admin');

-- profiles
DROP POLICY IF EXISTS "profiles: own read"     ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin write"  ON public.profiles;
CREATE POLICY "profiles: own read"     ON public.profiles FOR SELECT USING (auth.uid() = id OR current_role_name() = 'admin');
CREATE POLICY "profiles: admin write"  ON public.profiles FOR ALL    USING (current_role_name() = 'admin');

-- admins
DROP POLICY IF EXISTS "admins: admin read"     ON public.admins;
CREATE POLICY "admins: admin read"     ON public.admins FOR SELECT USING (current_role_name() = 'admin');

-- accountants
DROP POLICY IF EXISTS "accountants: signed-in read" ON public.accountants;
DROP POLICY IF EXISTS "accountants: admin write"    ON public.accountants;
CREATE POLICY "accountants: signed-in read" ON public.accountants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "accountants: admin write"    ON public.accountants FOR ALL    USING (current_role_name() = 'admin');

-- incharges
DROP POLICY IF EXISTS "incharges: signed-in read"  ON public.incharges;
DROP POLICY IF EXISTS "incharges: admin write"     ON public.incharges;
CREATE POLICY "incharges: signed-in read"  ON public.incharges FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "incharges: admin write"     ON public.incharges FOR ALL    USING (current_role_name() = 'admin');

-- colleges
DROP POLICY IF EXISTS "colleges: public read"      ON public.colleges;
DROP POLICY IF EXISTS "colleges: admin write"      ON public.colleges;
DROP POLICY IF EXISTS "colleges: payment update"   ON public.colleges;
CREATE POLICY "colleges: public read"      ON public.colleges FOR SELECT USING (true);
CREATE POLICY "colleges: admin write"      ON public.colleges FOR ALL    USING (current_role_name() = 'admin');
CREATE POLICY "colleges: payment update"   ON public.colleges FOR UPDATE USING (true) WITH CHECK (true);

-- student_leaders
DROP POLICY IF EXISTS "student_leaders: signed-in read" ON public.student_leaders;
DROP POLICY IF EXISTS "student_leaders: admin write"    ON public.student_leaders;
CREATE POLICY "student_leaders: signed-in read" ON public.student_leaders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "student_leaders: admin write"    ON public.student_leaders FOR ALL    USING (current_role_name() = 'admin');

-- lots
DROP POLICY IF EXISTS "lots: signed-in read"  ON public.lots;
DROP POLICY IF EXISTS "lots: admin write"     ON public.lots;
DROP POLICY IF EXISTS "lots: public read"     ON public.lots;
CREATE POLICY "lots: public read"     ON public.lots FOR SELECT USING (true);
CREATE POLICY "lots: admin write"     ON public.lots FOR ALL    USING (current_role_name() = 'admin');

-- registrations
DROP POLICY IF EXISTS "registrations: public read"   ON public.registrations;
DROP POLICY IF EXISTS "registrations: admin write"   ON public.registrations;
CREATE POLICY "registrations: public read"   ON public.registrations FOR SELECT USING (true);
CREATE POLICY "registrations: admin write"   ON public.registrations FOR ALL    USING (current_role_name() = 'admin');

-- students
DROP POLICY IF EXISTS "students: public read"                   ON public.students;
DROP POLICY IF EXISTS "students: admin write"                   ON public.students;
DROP POLICY IF EXISTS "students: incharge update winner_place"  ON public.students;
CREATE POLICY "students: public read"   ON public.students FOR SELECT USING (true);
CREATE POLICY "students: admin write"   ON public.students FOR ALL    USING (current_role_name() = 'admin');
CREATE POLICY "students: incharge update winner_place" ON public.students FOR UPDATE
  USING (
    current_role_name() = 'incharge' AND
    event_id IN (
      SELECT event_id FROM public.incharges WHERE id = (
        SELECT ref_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- certificates
DROP POLICY IF EXISTS "certificates: admin read"  ON public.certificates;
DROP POLICY IF EXISTS "certificates: admin write" ON public.certificates;
CREATE POLICY "certificates: admin read"  ON public.certificates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "certificates: admin write" ON public.certificates FOR ALL    USING (current_role_name() = 'admin');

-- payments (legacy)
DROP POLICY IF EXISTS "payments: admin read"  ON public.payments;
DROP POLICY IF EXISTS "payments: admin write" ON public.payments;
CREATE POLICY "payments: admin read"  ON public.payments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "payments: admin write" ON public.payments FOR ALL    USING (current_role_name() = 'admin');

-- payment_polls
DROP POLICY IF EXISTS "payment_polls: public read"  ON public.payment_polls;
DROP POLICY IF EXISTS "payment_polls: admin write"  ON public.payment_polls;
CREATE POLICY "payment_polls: public read"  ON public.payment_polls FOR SELECT USING (true);
CREATE POLICY "payment_polls: admin write"  ON public.payment_polls FOR ALL    USING (current_role_name() = 'admin');

-- payment_logs
DROP POLICY IF EXISTS "payment_logs: public insert" ON public.payment_logs;
DROP POLICY IF EXISTS "payment_logs: admin read"    ON public.payment_logs;
CREATE POLICY "payment_logs: public insert" ON public.payment_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "payment_logs: admin read"    ON public.payment_logs FOR SELECT USING (true);

-- winners
DROP POLICY IF EXISTS "winners: public read"  ON public.winners;
DROP POLICY IF EXISTS "winners: admin write"  ON public.winners;
CREATE POLICY "winners: public read"  ON public.winners FOR SELECT USING (true);
CREATE POLICY "winners: admin write"  ON public.winners FOR ALL    USING (current_role_name() = 'admin');


-- ============================================================================
-- SECTION 7 — Functions and Triggers
-- ============================================================================

-- 7a. Auto-confirm email for new auth users
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
BEGIN
  NEW.email_confirmed_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_auto_confirm_email ON auth.users;
CREATE TRIGGER tr_auto_confirm_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_email();

-- 7b. Normalize student name on INSERT/UPDATE
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

-- 7c. Sync winning prizes when winners row is inserted/updated
CREATE OR REPLACE FUNCTION public.sync_winning_prizes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_first_college     text;
  v_first_college_id  uuid;
  v_second_college    text;
  v_second_college_id uuid;
BEGIN
  -- Reset all prizes for the event
  UPDATE public.students SET winning_prize = NULL WHERE event_id = NEW.event_id;

  -- First place
  IF NEW.first_place IS NOT NULL AND NEW.first_place <> '-' THEN
    SELECT assigned_college INTO v_first_college
      FROM public.lots WHERE lot_name = NEW.first_place LIMIT 1;
    IF v_first_college IS NOT NULL THEN
      SELECT id INTO v_first_college_id FROM public.colleges
        WHERE college = v_first_college LIMIT 1;
      IF v_first_college_id IS NOT NULL THEN
        UPDATE public.students SET winning_prize = 'First Place'
          WHERE event_id = NEW.event_id AND college_id = v_first_college_id;
      END IF;
    END IF;
  END IF;

  -- Second place
  IF NEW.second_place IS NOT NULL AND NEW.second_place <> '-' THEN
    SELECT assigned_college INTO v_second_college
      FROM public.lots WHERE lot_name = NEW.second_place LIMIT 1;
    IF v_second_college IS NOT NULL THEN
      SELECT id INTO v_second_college_id FROM public.colleges
        WHERE college = v_second_college LIMIT 1;
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

-- 7d. Clear winning prizes when a winner row is deleted
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

-- 7e. register_team — core team registration with min/max size validation
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

  -- Duplicate name guard within the team
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
    RAISE EXCEPTION 'This college has already registered for this event, or a participant name is already registered elsewhere.';
END;
$$;

-- 7f. register_guest_team — public-facing registration with lot auto-assignment
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
  v_lot_id       uuid;
  v_lot_name     text;
BEGIN
  -- Find or create college
  SELECT id INTO v_college_id FROM public.colleges
   WHERE lower(trim(college)) = lower(trim(p_college_name)) LIMIT 1;

  IF v_college_id IS NULL THEN
    INSERT INTO public.colleges (college, department, phone, email, address, status)
    VALUES (p_college_name, p_college_dept, p_college_phone, p_college_email, p_college_address, 'active')
    RETURNING id INTO v_college_id;
  END IF;

  -- Find or create student leader (one per college enforced by unique constraint)
  SELECT id INTO v_leader_id FROM public.student_leaders
   WHERE lower(trim(email)) = lower(trim(p_email)) AND college_id = v_college_id LIMIT 1;

  IF v_leader_id IS NULL THEN
    INSERT INTO public.student_leaders (name, phone, email, department, college_id, status)
    VALUES (p_leader_name, p_phone, p_email, p_department, v_college_id, 'active')
    RETURNING id INTO v_leader_id;
  END IF;

  -- Lot assignment: reuse if already assigned to this college, else claim next free lot
  SELECT id, lot_name INTO v_lot_id, v_lot_name FROM public.lots
   WHERE lower(trim(assigned_college)) = lower(trim(p_college_name)) LIMIT 1;

  IF v_lot_id IS NULL THEN
    SELECT id, lot_name INTO v_lot_id, v_lot_name FROM public.lots
     WHERE is_assigned = false ORDER BY lot_name ASC LIMIT 1;

    IF v_lot_id IS NOT NULL THEN
      UPDATE public.lots
         SET is_assigned = true, assigned_college = p_college_name
       WHERE id = v_lot_id;
    END IF;
  END IF;

  -- Register each event in the payload
  FOR v_reg_item IN SELECT * FROM jsonb_array_elements(p_registrations) LOOP
    v_event_id     := (v_reg_item->>'eventId')::uuid;
    v_participants := v_reg_item->'participants';
    v_reg_id       := public.register_team(v_college_id, v_leader_id, v_event_id, v_participants);

    UPDATE public.registrations
       SET veg_count    = p_veg_count,
           nonveg_count = p_nonveg_count,
           status       = CASE WHEN v_lot_id IS NOT NULL THEN 'lot_assigned' ELSE 'pending' END
     WHERE id = v_reg_id;
  END LOOP;

  out_leader_id := v_leader_id;
  out_college_id := v_college_id;
  RETURN NEXT;
END;
$$;

-- 7g. create_leader_profile — Security-definer helper used on leader signup
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
-- SECTION 8 — Realtime publication (safe idempotent adds)
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
-- SECTION 9 — Storage bucket for assets (invitation PDF, QR images)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload"  ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
CREATE POLICY "Admin Upload"  ON storage.objects FOR ALL
  USING (bucket_id = 'assets' AND current_role_name() = 'admin');


-- ============================================================================
-- SECTION 10 — CLEAR transactional/registration data
--              (runs every time — clears colleges, students, registrations, etc.)
--              Preserved: events, settings, leaders, rules, venues, admin auth
-- ============================================================================

-- Disable FK checks temporarily for clean cascaded truncation
SET session_replication_role = 'replica';

TRUNCATE TABLE public.payment_logs    CASCADE;
TRUNCATE TABLE public.payment_polls   CASCADE;
TRUNCATE TABLE public.winners         CASCADE;
TRUNCATE TABLE public.certificates    CASCADE;
TRUNCATE TABLE public.payments        CASCADE;
TRUNCATE TABLE public.students        CASCADE;
TRUNCATE TABLE public.registrations   CASCADE;
TRUNCATE TABLE public.lots            CASCADE;
TRUNCATE TABLE public.student_leaders CASCADE;
TRUNCATE TABLE public.colleges        CASCADE;

-- Remove non-admin auth accounts and their profiles
DELETE FROM auth.users   WHERE id NOT IN (SELECT id FROM public.profiles WHERE role = 'admin');
DELETE FROM public.profiles WHERE role <> 'admin';

SET session_replication_role = 'origin';


-- ============================================================================
-- SECTION 11 — Default seed data
--              (settings use ON CONFLICT DO UPDATE so values are refreshed)
-- ============================================================================

-- 11a. Default venues
INSERT INTO public.venues (venue_name) VALUES
  ('CS Lab I'),
  ('CS Lab II'),
  ('CS Lab III'),
  ('PG Lab'),
  ('Main Seminar Hall'),
  ('CS Seminar Hall'),
  ('HOD Office'),
  ('UG Lab 5'),
  ('Conference Hall')
ON CONFLICT (venue_name) DO NOTHING;

-- 11b. Default page settings (ON CONFLICT DO UPDATE so fresh values always apply)
INSERT INTO public.settings (key_name, value) VALUES
  ('event_date',              '2026-09-25 09:00:00'),
  ('invitation_title',        'You Are Cordially Invited'),
  ('invitation_tagline',      'STRATA 2K26 — State Level Intercollegiate Technical Meet, ANJAC Sivakasi'),
  ('invitation_body',         'On behalf of the Department of Computer Science, Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi, we warmly invite you and your talented students to participate in STRATA 2K26 — our prestigious State Level Intercollegiate Technical Meet.

The event features 6 exciting contests spanning Coding, Web Design, Technical Quiz, Paper Presentation, AI & Prompt Engineering, and IT Management challenges.

Date: 25 September 2026
Venue: ANJAC, Sivakasi
Registration Fee: Rs. 150 per participant (Spot Registration)
Spot Registration opens at 8:30 AM and closes at 9:30 AM.

We warmly look forward to welcoming you and your participants to our campus.'),
  ('invitation_pdf_url',      ''),
  ('contact_email',           'cs@anjaconline.org'),
  ('contact_phone',           '+91 98765 43210'),
  ('contact_address',         'Department of Computer Science, Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi - Srivilliputhur Road, Sivakasi - 626 124, Tamil Nadu, India.'),
  ('contact_extra',           'Venue Coordinator: Dr. V. Venkatesh Babu (HOD, CS Dept.)'),
  ('fee_per_student',         '150'),
  ('gpay_qr_url',             ''),
  ('whatsapp_group_link',     ''),
  ('participation_cert_url',  ''),
  ('winner_cert_1_url',       ''),
  ('winner_cert_2_url',       '')
ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value;

-- 11c. Default leaders (Principal + HOD)
DELETE FROM public.leaders;
INSERT INTO public.leaders (name, position, description) VALUES
  (
    'Dr. C. Ashok',
    'Principal',
    'ANJAC has always championed technical and creative integration. Fests like STRATA provide students the canvas they need to translate theoretical learning into practical mastery. I welcome all participants to engage, learn, and excel.'
  ),
  (
    'V. Venkatesh Babu',
    'Head of Department',
    'Technology changes rapidly, and students must possess critical adaptability. STRATA is curated to test that very agility. From complex debugging routines to dynamic design paradigms, we aim to prepare the next generation of IT leaders. Best of luck!'
  );

-- 11d. Default rules
DELETE FROM public.rules;
INSERT INTO public.rules (title, points) VALUES
  (
    'Eligibility Criteria',
    'Only bona fide UG and PG students of Computer Science, Computer Applications, and IT streams are eligible to participate.
Participant overlaps are permitted, but it is their responsibility to manage clashing event schedules.
Maximum representation of 12 students per college registration team.'
  ),
  (
    'Team Registration',
    'Participants must produce their College Identity Card and a Bonafide Certificate signed by their Principal/HOD at the registration desk.
Registration fee is Rs. 150 per participant, payable at the spot registration desk on arrival.
Spot registration opens at 8:30 AM and strictly closes at 9:30 AM.'
  ),
  (
    'Conduct & Decorum',
    'Strict formal dress code is mandatory for all students attending the technical meet.
Disciplined behavior must be maintained in the seminar halls, laboratories, and college premises.
Misbehavior or violation of rules will lead to the immediate disqualification of the entire college team.'
  );

-- 11e. Default events (6 contests, fixed UUIDs for idempotent updates)
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
    '50000000-0000-0000-0000-000000000001',
    'Code Craft', 'Coding & Debugging',
    'Unleash your programming intellect. Solve algorithmic puzzles, complete data structure challenges, and write clean, optimized code under time constraints.',
    E'Individual event.\nParticipants can choose between C, C++, Java, or Python.\nDuration: 45 minutes.\nStrictly no internet access or external devices allowed.\nDecisions of the jury will be final and binding.',
    'Mrs. A. Devi', '1','1','1', 'CS Lab III','CS Lab III','10:00','10:00'
  ),(
    '50000000-0000-0000-0000-000000000002',
    'Web Vision', 'Web Design',
    'Build the future of UI. Design and implement responsive, visually outstanding, and accessible web experiences based on a surprise live theme.',
    E'Team of 2 members maximum.\nHTML, CSS, JS, and CSS Frameworks (Bootstrap/Tailwind via CDN) are permitted.\nTime limit: 60 minutes.\nPre-made templates or themes are strictly forbidden.\nTheme will be announced at the commencement of the event.',
    'Mr. M. Rajesh', '1','2','2', 'UG Lab 5','UG Lab 5','10:30','10:30'
  ),(
    '50000000-0000-0000-0000-000000000003',
    'Quiz Quest', 'Technical Quiz',
    'Test your range of IT knowledge. A fast-paced contest testing your familiarity with computer history, networking, modern tools, and system architecture.',
    E'Team of 2 members.\nPreliminary written round will filter top 6 teams for the stage quiz.\nNo negative marking in preliminary round.\nStage quiz consists of Audio-Visual, Rapid Fire, and Buzz rounds.\nMobile usage results in instant disqualification.',
    'Dr. P. Senthil', '2','2','2', 'Main Seminar Hall','Main Seminar Hall','11:30','11:30'
  ),(
    '50000000-0000-0000-0000-000000000004',
    'Paper Vista', 'PPT Presentation',
    'Present your technical findings. Showcase original research papers and ideas on AI, Cloud Computing, Cyber Security, and Big Data.',
    E'Team of maximum 2 members.\nSubmit a soft copy of the PPT and abstract during desk registration.\nTopics: AI/ML, Blockchain, Cybersecurity, Cloud Systems, IoT.\nPresentation: 7 minutes | Q&A: 3 minutes.',
    'Dr. R. Kavitha', '1','2','2', 'CS Seminar Hall','CS Seminar Hall','10:15','10:15'
  ),(
    '50000000-0000-0000-0000-000000000005',
    'AI Fusion', 'Prompt Engineering',
    'Prompt engineering challenge. Leverage LLMs and generative design interfaces to complete complex asset creation and prompt-optimization tasks.',
    E'Individual event.\nPrompt engineering challenge.\nTools and platforms will be provided by the host department.\nParticipants must achieve the target generated output in the fewest steps.\nStrict time limit of 30 minutes.\nPrompt logs must be saved and submitted.',
    'Mrs. S. Nancy', '1','1','1', 'PG Lab','PG Lab','11:00','11:00'
  ),(
    '50000000-0000-0000-0000-000000000006',
    'Pitch Perfect', 'IT Manager',
    'Enter the boardroom. Face high-pressure stress interviews, team coordination tests, and showcase manager-level problem-solving capacities.',
    E'Individual event.\nRound 1: Technical & Managerial Aptitude Test.\nRound 2: Group Discussion.\nRound 3: Stress Interview.\nFormal attire is mandatory. Participants must submit their Resume.',
    'V. Venkatesh Babu', '1','1','1', 'HOD Office','HOD Office','12:00','12:00'
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

-- 11f. Default lots (10 pre-created, all unassigned)
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
  ('Lot 10', false, '-');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
