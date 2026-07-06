-- ========================================================================
-- STRATA — Dummy / Seed Data Script
-- Run this in the Supabase SQL editor to populate all tables and mock users.
-- All mock users have the password: Password123
-- ========================================================================

-- Enable pgcrypto for password hashing
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------
-- 1. Insert Users into auth.users (Admin, Leader, Accountant)
-- ------------------------------------------------------------------------
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
) values 
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('Password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'leader@example.com',
  crypt('Password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  'accountant@example.com',
  crypt('Password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  now(),
  now()
);

-- ------------------------------------------------------------------------
-- 2. Insert Identities into auth.identities
-- ------------------------------------------------------------------------
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values 
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@example.com"}',
  'email',
  '00000000-0000-0000-0000-000000000001',
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  '{"sub":"00000000-0000-0000-0000-000000000002","email":"leader@example.com"}',
  'email',
  '00000000-0000-0000-0000-000000000002',
  now(),
  now(),
  now()
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000003',
  '{"sub":"00000000-0000-0000-0000-000000000003","email":"accountant@example.com"}',
  'email',
  '00000000-0000-0000-0000-000000000003',
  now(),
  now(),
  now()
);

-- ------------------------------------------------------------------------
-- 3. Insert into public.admins
-- ------------------------------------------------------------------------
insert into public.admins (id, name, email)
values ('10000000-0000-0000-0000-000000000001', 'Strata Admin', 'admin@example.com');

-- ------------------------------------------------------------------------
-- 4. Insert into public.colleges
-- ------------------------------------------------------------------------
insert into public.colleges (id, college_name, department, phone, email, address, security_token, status)
values ('40000000-0000-0000-0000-000000000001', 'Alpha College of Engineering', 'Computer Science', '123-456-7890', 'contact@alphacollege.edu', '123 Tech Way, Engineering City', 'tok_alpha_789', 'active');

-- ------------------------------------------------------------------------
-- 5. Insert into public.student_leaders
-- ------------------------------------------------------------------------
insert into public.student_leaders (id, name, phone, email, department, college_id, status)
values ('20000000-0000-0000-0000-000000000002', 'John Leader', '987-654-3210', 'leader@example.com', 'Information Technology', '40000000-0000-0000-0000-000000000001', 'active');

-- ------------------------------------------------------------------------
-- 6. Insert into public.accountants
-- ------------------------------------------------------------------------
insert into public.accountants (id, name, phone, email)
values ('30000000-0000-0000-0000-000000000003', 'Sarah Accountant', '555-0199', 'accountant@example.com');

-- ------------------------------------------------------------------------
-- 7. Insert into public.profiles
-- ------------------------------------------------------------------------
insert into public.profiles (id, role, name, ref_id, college_id)
values 
('00000000-0000-0000-0000-000000000001', 'admin', 'Strata Admin', '10000000-0000-0000-0000-000000000001', null),
('00000000-0000-0000-0000-000000000002', 'leader', 'John Leader', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000003', 'accountant', 'Sarah Accountant', '30000000-0000-0000-0000-000000000003', null);

-- ------------------------------------------------------------------------
-- 8. Insert into public.incharges
-- ------------------------------------------------------------------------
insert into public.incharges (id, name, phone, department)
values ('60000000-0000-0000-0000-000000000001', 'Dr. Robert Incharge', '111-222-3333', 'Computer Science & Engineering');

-- 9. Insert into public.events
-- ------------------------------------------------------------------------
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
);

-- ------------------------------------------------------------------------
-- 10. Insert into public.lots
-- ------------------------------------------------------------------------
insert into public.lots (id, lot_name, event_id)
values ('70000000-0000-0000-0000-000000000001', 'Lot Alpha-01', '50000000-0000-0000-0000-000000000001');

-- ------------------------------------------------------------------------
-- 11. Insert into public.registrations
-- ------------------------------------------------------------------------
insert into public.registrations (id, college_id, leader_id, event_id, lot_id, status, receipt_no)
values ('80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'paid', 'REC-2026-0001');

-- ------------------------------------------------------------------------
-- 12. Insert into public.students
-- ------------------------------------------------------------------------
insert into public.students (id, student_name, student_name_normalized, gender, department, year, registration_id, leader_id, college_id, event_id, certificate_status)
values 
('90000000-0000-0000-0000-000000000001', 'Alice Vance', 'alice vance', 'Female', 'Computer Science', '3rd Year', '80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'issued'),
('90000000-0000-0000-0000-000000000002', 'Bob Vance', 'bob vance', 'Male', 'Computer Science', '3rd Year', '80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'not issued');

-- ------------------------------------------------------------------------
-- 13. Insert into public.payments
-- ------------------------------------------------------------------------
insert into public.payments (id, registration_id, amount, payment_mode, receipt_no)
values ('a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 150.00, 'UPI', 'REC-2026-0001');

-- ------------------------------------------------------------------------
-- 14. Insert into public.certificates
-- ------------------------------------------------------------------------
insert into public.certificates (id, student_id, event_id, certificate_number, position)
values ('c0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'CERT-STRATA-0001', 'Winner');
