-- ========================================================================
-- STRATA — Database Update Script for Participants & Incharges
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ========================================================================

-- 1. Alter profiles table role constraint to support 'incharge'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'leader', 'accountant', 'incharge'));

-- 2. Update incharges table to add email and event_id
alter table public.incharges add column if not exists email text;
alter table public.incharges add column if not exists event_id uuid references public.events(id) on delete set null;

-- 3. Update students table to add email and winner_place
alter table public.students add column if not exists email text;
alter table public.students add column if not exists winner_place text;

-- 4. Update the register_team RPC function to store student email
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
      student_name, student_name_normalized, gender, department, year, email,
      registration_id, leader_id, college_id, event_id, certificate_status
    ) values (
      v_participant->>'studentName',
      lower(trim(v_participant->>'studentName')),
      v_participant->>'gender',
      v_participant->>'department',
      v_participant->>'year',
      v_participant->>'email',
      v_reg_id, p_leader_id, p_college_id, p_event_id, 'not issued'
    );
  end loop;

  return v_reg_id;

exception
  when unique_violation then
    raise exception 'This college has already registered for this event, or one of these participant names is already registered elsewhere.';
end;
$$;

-- 5. Add trigger to automatically handle student name normalization on direct table edits
create or replace function normalize_student_name_trigger()
returns trigger as $$
begin
  new.student_name_normalized := lower(trim(new.student_name));
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_normalize_student_name on public.students;
create trigger trg_normalize_student_name
before insert or update on public.students
for each row
execute function normalize_student_name_trigger();

-- 6. Add RLS Policies for incharge role on students
drop policy if exists "students: incharge update winner_place" on public.students;
create policy "students: incharge update winner_place" on public.students for update
  using (
    current_role_name() = 'incharge' and
    event_id in (
      select event_id from public.incharges where id = (
        select ref_id from public.profiles where id = auth.uid()
      )
    )
  );

-- 7. Add initial settings keys for certificates
insert into public.settings (key_name, value) values
('participation_cert_url', ''),
('winner_cert_1_url', ''),
('winner_cert_2_url', '')
on conflict (key_name) do nothing;
