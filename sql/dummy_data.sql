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

-- ------------------------------------------------------------------------
-- 9. Insert into public.events
-- ------------------------------------------------------------------------
insert into public.events (id, event_name, registration_fee, minimum_participants, maximum_participants, prelims_date, prelims_venue, mains_date, mains_venue, rules, winner_count, incharge_id, status)
values ('50000000-0000-0000-0000-000000000001', 'Vite & Supabase Coding Hackathon', 150.00, 1, 3, '2026-08-15', 'Lab A', '2026-08-16', 'Main Auditorium', '1. Use React and Supabase. 2. Work in teams of up to 3.', 3, '60000000-0000-0000-0000-000000000001', 'active');

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
