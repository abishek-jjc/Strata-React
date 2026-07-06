  -- ========================================================================
  -- STRATA — Supabase / Postgres schema
  -- Run this in the Supabase SQL editor (or via `supabase db push`)
  -- ========================================================================

  create extension if not exists "pgcrypto";

  -- ------------------------------------------------------------------------
  -- 1. PROFILES — maps auth.users to role + linked record.
  --    A trigger is NOT used here on purpose: rows are inserted by the
  --    create-user Edge Function (service role), and the very first admin
  --    is inserted by hand (see README.txt step 4).
  -- ------------------------------------------------------------------------
  create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('admin', 'leader', 'accountant')),
    name text,
    ref_id uuid,        -- points at admins.id / student_leaders.id / accountants.id
    college_id uuid,    -- only populated for role = 'leader'
    created_at timestamptz default now()
  );

  -- ------------------------------------------------------------------------
  -- 2. CORE TABLES
  -- ------------------------------------------------------------------------
  create table admins (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    created_at timestamptz default now()
  );

  create table events (
    id uuid primary key default gen_random_uuid(),
    event_name text not null,
    registration_fee numeric not null default 0,
    minimum_participants int not null default 1,
    maximum_participants int not null default 10,
    prelims_date date,
    prelims_venue text,
    mains_date date,
    mains_venue text,
    rules text,
    winner_count int default 3,
    incharge_id uuid,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz default now()
  );

  create table colleges (
    id uuid primary key default gen_random_uuid(),
    college_name text not null,
    department text,
    phone text,
    email text,
    address text,
    security_token text,
    encrypted_qr text,
    qr_image_data_url text,   -- QR image as a data URL — no Storage bucket needed
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz default now()
  );

  create table student_leaders (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text,
    email text not null,
    department text,
    college_id uuid references colleges(id),
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz default now()
  );

  create table accountants (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text,
    email text not null,
    created_at timestamptz default now()
  );

  create table incharges (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text,
    department text,
    created_at timestamptz default now()
  );

  create table lots (
    id uuid primary key default gen_random_uuid(),
    lot_name text not null,
    event_id uuid not null references events(id) on delete cascade,
    created_at timestamptz default now()
  );

  create table registrations (
    id uuid primary key default gen_random_uuid(),
    college_id uuid not null references colleges(id),
    leader_id uuid not null references student_leaders(id),
    event_id uuid not null references events(id),
    lot_id uuid references lots(id),
    status text not null default 'pending'
      check (status in ('pending', 'lot_assigned', 'paid', 'approved', 'rejected')),
    receipt_no text,
    registration_date timestamptz default now(),
    -- The core integrity rule from the report: one college can only
    -- register once per event. Enforced by Postgres itself — no
    -- application-level race condition possible.
    unique (college_id, event_id)
  );

  create table students (
    id uuid primary key default gen_random_uuid(),
    student_name text not null,
    -- Normalized (trimmed + lowercased) name, globally unique. This is
    -- what actually enforces the report's "no duplicate participant
    -- names anywhere in the system" rule — atomically, at the database
    -- level, with no pre-check race window.
    student_name_normalized text not null unique,
    gender text,
    department text,
    year text,
    registration_id uuid references registrations(id) on delete cascade,
    leader_id uuid references student_leaders(id),
    college_id uuid references colleges(id),
    event_id uuid references events(id),
    certificate_status text default 'not issued',
    created_at timestamptz default now()
  );

  create table payments (
    id uuid primary key default gen_random_uuid(),
    registration_id uuid references registrations(id),
    amount numeric not null,
    payment_mode text,
    receipt_no text,
    payment_date timestamptz default now()
  );

  create table certificates (
    id uuid primary key default gen_random_uuid(),
    student_id uuid references students(id),
    event_id uuid references events(id),
    certificate_number text not null,
    position text,
    generated_date timestamptz default now()
  );

  -- ------------------------------------------------------------------------
  -- 3. HELPER — reads the caller's role once, used throughout RLS below.
  -- ------------------------------------------------------------------------
  create or replace function current_role_name()
  returns text
  language sql stable security definer
  as $$
    select role from profiles where id = auth.uid();
  $$;

  -- ------------------------------------------------------------------------
  -- 4. register_team RPC — the whole team-registration flow, atomically.
  --    Runs as one Postgres transaction. Two real UNIQUE constraints
  --    (registrations.college_id+event_id, students.student_name_normalized)
  --    do the heavy lifting — this function is mostly validation +
  --    friendlier error messages on top of them.
  -- ------------------------------------------------------------------------
  create or replace function register_team(
    p_college_id uuid,
    p_leader_id uuid,
    p_event_id uuid,
    p_participants jsonb
  ) returns uuid
  language plpgsql security definer
  as $$
  declare
    v_min int;
    v_max int;
    v_count int;
    v_reg_id uuid;
    v_participant jsonb;
    v_names text[];
  begin
    select minimum_participants, maximum_participants
      into v_min, v_max
      from events where id = p_event_id;

    if v_min is null then
      raise exception 'Event not found.';
    end if;

    v_count := jsonb_array_length(p_participants);
    if v_count < v_min then
      raise exception 'Needs at least % participants — currently %.', v_min, v_count;
    end if;
    if v_count > v_max then
      raise exception 'Maximum % participants allowed — currently %.', v_max, v_count;
    end if;

    -- Catch within-team duplicates before hitting the DB constraint, so
    -- the error message points at the actual problem.
    select array_agg(lower(trim(elem->>'studentName')))
      into v_names
      from jsonb_array_elements(p_participants) elem;

    if array_length(v_names, 1) <> (select count(distinct x) from unnest(v_names) x) then
      raise exception 'Two participants in this team have the same name.';
    end if;

    insert into registrations (college_id, leader_id, event_id, status)
    values (p_college_id, p_leader_id, p_event_id, 'pending')
    returning id into v_reg_id;

    for v_participant in select * from jsonb_array_elements(p_participants)
    loop
      insert into students (
        student_name, student_name_normalized, gender, department, year,
        registration_id, leader_id, college_id, event_id, certificate_status
      ) values (
        v_participant->>'studentName',
        lower(trim(v_participant->>'studentName')),
        v_participant->>'gender',
        v_participant->>'department',
        v_participant->>'year',
        v_reg_id, p_leader_id, p_college_id, p_event_id, 'not issued'
      );
    end loop;

    return v_reg_id;

  exception
    when unique_violation then
      -- Fires from either UNIQUE constraint: duplicate registration for
      -- this college+event, or a participant name already used
      -- somewhere else in the system.
      raise exception 'This college has already registered for this event, or one of these participant names is already registered elsewhere.';
  end;
  $$;

  -- ------------------------------------------------------------------------
  -- 5. ROW LEVEL SECURITY
  -- ------------------------------------------------------------------------
  alter table profiles enable row level security;
  alter table admins enable row level security;
  alter table events enable row level security;
  alter table colleges enable row level security;
  alter table student_leaders enable row level security;
  alter table accountants enable row level security;
  alter table incharges enable row level security;
  alter table lots enable row level security;
  alter table registrations enable row level security;
  alter table students enable row level security;
  alter table payments enable row level security;
  alter table certificates enable row level security;

  create policy "profiles: read own or admin" on profiles for select
    using (auth.uid() = id or current_role_name() = 'admin');
  create policy "profiles: admin writes" on profiles for all
    using (current_role_name() = 'admin');

  create policy "admins: admin only" on admins for all
    using (current_role_name() = 'admin');

  create policy "events: public read" on events for select using (true);
  create policy "events: admin write" on events for insert with check (current_role_name() = 'admin');
  create policy "events: admin update" on events for update using (current_role_name() = 'admin');
  create policy "events: admin delete" on events for delete using (current_role_name() = 'admin');

  create policy "colleges: signed-in read" on colleges for select using (auth.uid() is not null);
  create policy "colleges: admin write" on colleges for insert with check (current_role_name() = 'admin');
  create policy "colleges: admin update" on colleges for update using (current_role_name() = 'admin');
  create policy "colleges: admin delete" on colleges for delete using (current_role_name() = 'admin');

  create policy "student_leaders: signed-in read" on student_leaders for select using (auth.uid() is not null);
  create policy "student_leaders: admin write" on student_leaders for insert with check (current_role_name() = 'admin');
  create policy "student_leaders: admin update" on student_leaders for update using (current_role_name() = 'admin');
  create policy "student_leaders: admin delete" on student_leaders for delete using (current_role_name() = 'admin');

  create policy "accountants: signed-in read" on accountants for select using (auth.uid() is not null);
  create policy "accountants: admin write" on accountants for insert with check (current_role_name() = 'admin');
  create policy "accountants: admin update" on accountants for update using (current_role_name() = 'admin');
  create policy "accountants: admin delete" on accountants for delete using (current_role_name() = 'admin');

  create policy "incharges: signed-in read" on incharges for select using (auth.uid() is not null);
  create policy "incharges: admin write" on incharges for all using (current_role_name() = 'admin');

  create policy "lots: signed-in read" on lots for select using (auth.uid() is not null);
  create policy "lots: admin write" on lots for all using (current_role_name() = 'admin');

  create policy "registrations: signed-in read" on registrations for select using (auth.uid() is not null);
  create policy "registrations: admin/accountant update" on registrations for update
    using (current_role_name() in ('admin', 'accountant'));
  create policy "registrations: admin delete" on registrations for delete using (current_role_name() = 'admin');
  -- Note: inserts into registrations happen only via the register_team()
  -- function (security definer), so no direct insert policy is granted
  -- to the 'leader' role — this forces every registration through the
  -- validated RPC path instead of a raw table insert.

  create policy "students: signed-in read" on students for select using (auth.uid() is not null);
  create policy "students: admin write" on students for all using (current_role_name() = 'admin');
  -- Same reasoning as registrations: student rows are created only via
  -- register_team(); leaders don't get a direct insert policy here.

  create policy "payments: signed-in read" on payments for select using (auth.uid() is not null);
  create policy "payments: accountant write" on payments for all using (current_role_name() = 'accountant');

  create policy "certificates: signed-in read" on certificates for select using (auth.uid() is not null);
  create policy "certificates: admin write" on certificates for all using (current_role_name() = 'admin');

  -- ------------------------------------------------------------------------
  -- 6. Realtime — enable change broadcasting for the tables the app
  --    subscribes to (Supabase dashboard: Database > Replication also
  --    works, this does the same thing via SQL).
  -- ------------------------------------------------------------------------
  alter publication supabase_realtime add table events, colleges, student_leaders,
    accountants, incharges, lots, registrations, students, payments, certificates;
