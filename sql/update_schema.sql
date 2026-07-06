-- ========================================================================
-- STRATA — Database Update Script for XAMPP Migration
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ========================================================================

-- 1. Alter events table to add missing fields from XAMPP
alter table public.events add column if not exists category text;
alter table public.events add column if not exists details text;
alter table public.events add column if not exists team_size text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists staff_incharge text;

-- 2. Add food preference tracking to registrations
alter table public.registrations add column if not exists veg_count int not null default 0;
alter table public.registrations add column if not exists nonveg_count int not null default 0;

-- 3. Create leaders table (Principal, HOD messages)
create table if not exists public.leaders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text not null,
  description text not null,
  created_at timestamptz default now()
);

-- 4. Create rules table (general instructions)
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  points text not null,
  created_at timestamptz default now()
);

-- 5. Create settings table (meet parameters, countdown)
create table if not exists public.settings (
  key_name text primary key,
  value text not null
);

-- 6. Seed initial configurations
insert into public.settings (key_name, value) values
('event_date', '2026-09-25 09:00:00'),
('invitation_title', 'You Are Cordially Invited'),
('invitation_tagline', 'STRATA 2K26 — State Level Intercollegiate Technical Meet, ANJAC Sivakasi'),
('invitation_body', 'On behalf of the Department of Computer Science, Ayya Nadar Janaki Ammal College (Autonomous), Sivakasi, we warmly invite you and your talented students to participate in STRATA 2K26 — our prestigious State Level Intercollegiate Technical Meet.

The event features 6 exciting contests spanning Coding, Web Design, Technical Quiz, Paper Presentation, AI & Prompt Engineering, and IT Management challenges.

Date: 25 September 2026
Venue: ANJAC, Sivakasi
Registration Fee: Rs. 150 per participant (Spot Registration)
Spot Registration opens at 8:30 AM and closes at 9:30 AM.

We warmly look forward to welcoming you and your participants to our campus.')
on conflict (key_name) do nothing;

insert into public.leaders (name, position, description) values
('Dr. C. Ashok', 'Principal', 'ANJAC has always championed technical and creative integration. Fests like STRATA provide students the canvas they need to translate theoretical learning into practical mastery. I welcome all participants to engage, learn, and excel.'),
('V. Venkatesh Babu', 'Head of Department', 'Technology changes rapidly, and students must possess critical adaptability. STRATA is curated to test that very agility. From complex debugging routines to dynamic design paradigms, we aim to prepare the next generation of IT leaders. Best of luck!')
on conflict do nothing;

insert into public.rules (title, points) values
('Eligibility Criteria', 'Only bona fide UG and PG students of Computer Science, Computer Applications, and IT streams are eligible to participate.
Participant overlaps are permitted, but it is their responsibility to manage clashing event schedules.
Maximum representation of 12 students per college registration team.'),
('Team Registration', 'Participants must produce their College Identity Card and a Bonafide Certificate signed by their Principal/HOD at the registration desk.
Registration fee is Rs. 150 per participant, payable at the spot registration desk on arrival.
Spot registration opens at 8:30 AM and strictly closes at 9:30 AM.'),
('Conduct & Decorum', 'Strict formal dress code is mandatory for all students attending the technical meet.
Disciplined behavior must be maintained in the seminar halls, laboratories, and college premises.
Misbehavior or violation of rules will lead to the immediate disqualification of the entire college team.')
on conflict do nothing;

-- 6.1. Seed 6 Default Contests
insert into public.events (id, event_name, category, details, team_size, description, rules, staff_incharge, registration_fee, minimum_participants, maximum_participants, prelims_date, prelims_venue, mains_date, mains_venue, winner_count, status) values
(
  '50000000-0000-0000-0000-000000000001',
  'Code Craft',
  'Coding & Debugging',
  'CS Lab 3 | 10:00 AM',
  '1 Member (Individual)',
  'Unleash your programming intellect. Solve algorithmic puzzles, complete data structure challenges, and write clean, optimized code under time constraints.',
  'Individual event.
Participants can choose between C, C++, Java, or Python.
Duration: 45 minutes.
Strictly no internet access or external devices allowed.
Decisions of the jury will be final and binding.',
  'Mrs. A. Devi',
  150.00,
  1,
  1,
  '2026-09-25',
  'CS Lab 3',
  '2026-09-25',
  'CS Lab 3',
  3,
  'active'
),
(
  '50000000-0000-0000-0000-000000000002',
  'Web Vision',
  'Web Design',
  'UG Lab 5 | 10:30 AM',
  'Max 2 Members per Team',
  'Build the future of UI. Design and implement responsive, visually outstanding, and accessible web experiences based on a surprise live theme.',
  'Team of 2 members maximum.
HTML, CSS, JS, and CSS Frameworks (Bootstrap/Tailwind via CDN) are permitted.
Time limit: 60 minutes.
Pre-made templates or themes are strictly forbidden.
Theme will be announced at the commencement of the event.',
  'Mr. M. Rajesh',
  150.00,
  1,
  2,
  '2026-09-25',
  'UG Lab 5',
  '2026-09-25',
  'UG Lab 5',
  3,
  'active'
),
(
  '50000000-0000-0000-0000-000000000003',
  'Quiz Quest',
  'Technical Quiz',
  'Main Seminar Hall | 11:30 AM',
  '2 Members per Team',
  'Test your range of IT knowledge. A fast-paced contest testing your familiarity with computer history, networking, modern tools, and system architecture.',
  'Team of 2 members.
Preliminary written round will filter top 6 teams for the stage quiz.
No negative marking in preliminary round.
Stage quiz consists of Audio-Visual, Rapid Fire, and Buzz rounds.
Mobile usage results in instant disqualification.',
  'Dr. P. Senthil',
  150.00,
  2,
  2,
  '2026-09-25',
  'Main Seminar Hall',
  '2026-09-25',
  'Main Seminar Hall',
  3,
  'active'
),
(
  '50000000-0000-0000-0000-000000000004',
  'Paper Vista',
  'PPT Presentation',
  'CS Seminar Hall | 10:15 AM',
  'Max 2 Members per Team',
  'Present your technical findings. Showcase original research papers and ideas on AI, Cloud Computing, Cyber Security, and Big Data.',
  'Team of maximum 2 members.
Submit a soft copy of the PPT and abstract during desk registration.
Topics: AI/ML, Blockchain, Cybersecurity, Cloud Systems, IoT.
Presentation: 7 minutes | Q&A: 3 minutes.',
  'Dr. R. Kavitha',
  150.00,
  1,
  2,
  '2026-09-25',
  'CS Seminar Hall',
  '2026-09-25',
  'CS Seminar Hall',
  3,
  'active'
),
(
  '50000000-0000-0000-0000-000000000005',
  'AI Fusion',
  'Prompt Engineering',
  'PG Lab | 11:00 AM',
  '1 Member (Individual)',
  'Prompt engineering challenge. Leverage LLMs and generative design interfaces to complete complex asset creation and prompt-optimization tasks.',
  'Individual event.
Prompt engineering challenge.
Tools and platforms will be provided by the host department.
Participants must achieve the target generated output in the fewest steps.
Strict time limit of 30 minutes.
Prompt logs must be saved and submitted.',
  'Mrs. S. Nancy',
  150.00,
  1,
  1,
  '2026-09-25',
  'PG Lab',
  '2026-09-25',
  'PG Lab',
  3,
  'active'
),
(
  '50000000-0000-0000-0000-000000000006',
  'Pitch Perfect',
  'IT Manager',
  'HOD Office | 12:00 PM',
  '1 Member (Individual)',
  'Enter the boardroom. Face high-pressure stress interviews, team coordination tests, and showcase manager-level problem-solving capacities.',
  'Individual event.
Round 1: Technical & Managerial Aptitude Test.
Round 2: Group Discussion.
Round 3: Stress Interview.
Formal attire is mandatory. Participants must submit their Resume.',
  'V. Venkatesh Babu',
  150.00,
  1,
  1,
  '2026-09-25',
  'HOD Office',
  '2026-09-25',
  'HOD Office',
  3,
  'active'
)
on conflict (id) do update set
  event_name = excluded.event_name,
  category = excluded.category,
  details = excluded.details,
  team_size = excluded.team_size,
  description = excluded.description,
  rules = excluded.rules,
  staff_incharge = excluded.staff_incharge,
  registration_fee = excluded.registration_fee,
  minimum_participants = excluded.minimum_participants,
  maximum_participants = excluded.maximum_participants,
  status = excluded.status;

-- 7. RLS Configuration
alter table public.leaders enable row level security;
alter table public.rules enable row level security;
alter table public.settings enable row level security;

-- Drop policies if they already exist, to allow clean re-runs
drop policy if exists "leaders: public read" on public.leaders;
drop policy if exists "leaders: admin write" on public.leaders;
drop policy if exists "rules: public read" on public.rules;
drop policy if exists "rules: admin write" on public.rules;
drop policy if exists "settings: public read" on public.settings;
drop policy if exists "settings: admin write" on public.settings;

create policy "leaders: public read" on public.leaders for select using (true);
create policy "leaders: admin write" on public.leaders for all using (current_role_name() = 'admin');

create policy "rules: public read" on public.rules for select using (true);
create policy "rules: admin write" on public.rules for all using (current_role_name() = 'admin');

create policy "settings: public read" on public.settings for select using (true);
create policy "settings: admin write" on public.settings for all using (current_role_name() = 'admin');

-- 8. Add to Realtime publication
-- Use DO block to prevent error if already added to publication
do $$
begin
  alter publication supabase_realtime add table public.leaders;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.rules;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.settings;
exception when others then null;
end $$;

-- 9. Transactional Guest Registration RPC
create or replace function register_guest_team(
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
) returns void
language plpgsql security definer
as $$
declare
  v_college_id uuid;
  v_leader_id uuid;
  v_reg_item jsonb;
  v_event_id uuid;
  v_participants jsonb;
  v_reg_id uuid;
begin
  -- Find or create college
  select id into v_college_id from colleges where lower(trim(college_name)) = lower(trim(p_college_name)) limit 1;
  if v_college_id is null then
    insert into colleges (college_name, department, phone, email, address, status)
    values (p_college_name, p_college_dept, p_college_phone, p_college_email, p_college_address, 'active')
    returning id into v_college_id;
  end if;

  -- Find or create student leader
  select id into v_leader_id from student_leaders where lower(trim(email)) = lower(trim(p_email)) and college_id = v_college_id limit 1;
  if v_leader_id is null then
    insert into student_leaders (name, phone, email, department, college_id, status)
    values (p_leader_name, p_phone, p_email, p_department, v_college_id, 'active')
    returning id into v_leader_id;
  end if;

  -- Register team for each event
  for v_reg_item in select * from jsonb_array_elements(p_registrations)
  loop
    v_event_id := (v_reg_item->>'eventId')::uuid;
    v_participants := v_reg_item->'participants';

    -- Call standard register_team function
    v_reg_id := register_team(v_college_id, v_leader_id, v_event_id, v_participants);

    -- Set food counts on the registrations row
    update registrations 
       set veg_count = p_veg_count, 
           nonveg_count = p_nonveg_count 
     where id = v_reg_id;
  end loop;
end;
$$;

-- ------------------------------------------------------------------------
-- 10. Storage setup for Invitation PDF
-- ------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Admin Upload" on storage.objects;

create policy "Public Access" on storage.objects for select using (bucket_id = 'assets');
create policy "Admin Upload" on storage.objects for all using (bucket_id = 'assets' and current_role_name() = 'admin');

-- Seed invitation_pdf_url setting
insert into public.settings (key_name, value)
values ('invitation_pdf_url', '')
on conflict (key_name) do nothing;
