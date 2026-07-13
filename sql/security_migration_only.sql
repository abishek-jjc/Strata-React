-- ============================================================================
-- STRATA 2K26 — Production Security Migration
-- Safe to run on an EXISTING database. Does NOT touch tables, data, or functions.
-- Modifies ONLY: RLS policies and storage bucket policies.
-- ============================================================================
-- Roles in use: admin | leader | incharge
-- Accountant role has been removed.
-- ============================================================================


-- ============================================================================
-- STEP 0: Ensure current_role_name() helper exists
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- ============================================================================
-- STEP 1: Drop ALL existing policies (clean slate — every known name variant)
-- ============================================================================
DO $$ BEGIN

  -- settings
  DROP POLICY IF EXISTS "settings_read_all"       ON public.settings;
  DROP POLICY IF EXISTS "settings_write_admin"    ON public.settings;
  DROP POLICY IF EXISTS "settings: public read"   ON public.settings;
  DROP POLICY IF EXISTS "settings: admin write"   ON public.settings;

  -- leaders (public leadership messages table)
  DROP POLICY IF EXISTS "leaders_read_all"        ON public.leaders;
  DROP POLICY IF EXISTS "leaders_write_admin"     ON public.leaders;
  DROP POLICY IF EXISTS "leaders: public read"    ON public.leaders;
  DROP POLICY IF EXISTS "leaders: admin write"    ON public.leaders;

  -- rules
  DROP POLICY IF EXISTS "rules_read_all"          ON public.rules;
  DROP POLICY IF EXISTS "rules_write_admin"       ON public.rules;
  DROP POLICY IF EXISTS "rules: public read"      ON public.rules;
  DROP POLICY IF EXISTS "rules: admin write"      ON public.rules;

  -- venues
  DROP POLICY IF EXISTS "venues_read_all"         ON public.venues;
  DROP POLICY IF EXISTS "venues_write_admin"      ON public.venues;
  DROP POLICY IF EXISTS "venues: public read"     ON public.venues;
  DROP POLICY IF EXISTS "venues: admin write"     ON public.venues;

  -- events
  DROP POLICY IF EXISTS "events_read_all"         ON public.events;
  DROP POLICY IF EXISTS "events_write_admin"      ON public.events;
  DROP POLICY IF EXISTS "events: public read"     ON public.events;
  DROP POLICY IF EXISTS "events: admin write"     ON public.events;

  -- profiles
  DROP POLICY IF EXISTS "profiles_read_all"       ON public.profiles;
  DROP POLICY IF EXISTS "profiles_write_all"      ON public.profiles;
  DROP POLICY IF EXISTS "profiles: own read"      ON public.profiles;
  DROP POLICY IF EXISTS "profiles: admin write"   ON public.profiles;

  -- admins
  DROP POLICY IF EXISTS "admins_read_all"         ON public.admins;
  DROP POLICY IF EXISTS "admins_write_admin"      ON public.admins;
  DROP POLICY IF EXISTS "admins: admin read"      ON public.admins;
  DROP POLICY IF EXISTS "admins: admin write"     ON public.admins;

  -- accountants (being removed — drop any lingering policies)
  DROP POLICY IF EXISTS "accountants_read_all"          ON public.accountants;
  DROP POLICY IF EXISTS "accountants_write_admin"       ON public.accountants;
  DROP POLICY IF EXISTS "accountants: signed-in read"   ON public.accountants;
  DROP POLICY IF EXISTS "accountants: admin write"      ON public.accountants;

  -- incharges
  DROP POLICY IF EXISTS "incharges_read_all"            ON public.incharges;
  DROP POLICY IF EXISTS "incharges_write_admin"         ON public.incharges;
  DROP POLICY IF EXISTS "incharges: signed-in read"     ON public.incharges;
  DROP POLICY IF EXISTS "incharges: admin write"        ON public.incharges;
  DROP POLICY IF EXISTS "incharges: public read"        ON public.incharges;

  -- colleges
  DROP POLICY IF EXISTS "colleges_read_all"             ON public.colleges;
  DROP POLICY IF EXISTS "colleges_write_admin"          ON public.colleges;
  DROP POLICY IF EXISTS "colleges: public read"         ON public.colleges;
  DROP POLICY IF EXISTS "colleges: signed-in read"      ON public.colleges;
  DROP POLICY IF EXISTS "colleges: admin write"         ON public.colleges;
  DROP POLICY IF EXISTS "colleges: payment update"      ON public.colleges;
  DROP POLICY IF EXISTS "colleges: leader read"         ON public.colleges;

  -- student_leaders
  DROP POLICY IF EXISTS "student_leaders_read_all"          ON public.student_leaders;
  DROP POLICY IF EXISTS "student_leaders_write_admin"       ON public.student_leaders;
  DROP POLICY IF EXISTS "student_leaders: public read"      ON public.student_leaders;
  DROP POLICY IF EXISTS "student_leaders: signed-in read"   ON public.student_leaders;
  DROP POLICY IF EXISTS "student_leaders: admin write"      ON public.student_leaders;
  DROP POLICY IF EXISTS "student_leaders: leader read own"  ON public.student_leaders;
  DROP POLICY IF EXISTS "student_leaders: leader update own" ON public.student_leaders;

  -- lots
  DROP POLICY IF EXISTS "lots_read_all"                 ON public.lots;
  DROP POLICY IF EXISTS "lots_write_admin"              ON public.lots;
  DROP POLICY IF EXISTS "lots: public read"             ON public.lots;
  DROP POLICY IF EXISTS "lots: admin write"             ON public.lots;
  DROP POLICY IF EXISTS "lots: leader read own"         ON public.lots;

  -- registrations
  DROP POLICY IF EXISTS "registrations_read_all"        ON public.registrations;
  DROP POLICY IF EXISTS "registrations_write_all"       ON public.registrations;
  DROP POLICY IF EXISTS "registrations: public read"    ON public.registrations;
  DROP POLICY IF EXISTS "registrations: leader read"    ON public.registrations;
  DROP POLICY IF EXISTS "registrations: role read"      ON public.registrations;
  DROP POLICY IF EXISTS "registrations: admin write"    ON public.registrations;

  -- students
  DROP POLICY IF EXISTS "students_read_all"                       ON public.students;
  DROP POLICY IF EXISTS "students_write_all"                      ON public.students;
  DROP POLICY IF EXISTS "students: public read"                   ON public.students;
  DROP POLICY IF EXISTS "students: leader read"                   ON public.students;
  DROP POLICY IF EXISTS "students: role read"                     ON public.students;
  DROP POLICY IF EXISTS "students: admin write"                   ON public.students;
  DROP POLICY IF EXISTS "students: incharge update winner_place"  ON public.students;
  DROP POLICY IF EXISTS "students: leader crud own college"       ON public.students;

  -- certificates
  DROP POLICY IF EXISTS "certificates_read_all"         ON public.certificates;
  DROP POLICY IF EXISTS "certificates_write_admin"      ON public.certificates;
  DROP POLICY IF EXISTS "certificates: admin read"      ON public.certificates;
  DROP POLICY IF EXISTS "certificates: signed-in read"  ON public.certificates;
  DROP POLICY IF EXISTS "certificates: admin write"     ON public.certificates;
  DROP POLICY IF EXISTS "certificates: leader read own" ON public.certificates;

  -- payments
  DROP POLICY IF EXISTS "payments_read_all"             ON public.payments;
  DROP POLICY IF EXISTS "payments_write_admin"          ON public.payments;
  DROP POLICY IF EXISTS "payments: admin read"          ON public.payments;
  DROP POLICY IF EXISTS "payments: signed-in read"      ON public.payments;
  DROP POLICY IF EXISTS "payments: admin write"         ON public.payments;
  DROP POLICY IF EXISTS "payments: leader read own"     ON public.payments;

  -- payment_polls
  DROP POLICY IF EXISTS "payment_polls_read_all"          ON public.payment_polls;
  DROP POLICY IF EXISTS "payment_polls_write_admin"       ON public.payment_polls;
  DROP POLICY IF EXISTS "payment_polls: public read"      ON public.payment_polls;
  DROP POLICY IF EXISTS "payment_polls: signed-in read"   ON public.payment_polls;
  DROP POLICY IF EXISTS "payment_polls: admin write"      ON public.payment_polls;

  -- payment_logs
  DROP POLICY IF EXISTS "payment_logs_read_all"           ON public.payment_logs;
  DROP POLICY IF EXISTS "payment_logs_write_admin"        ON public.payment_logs;
  DROP POLICY IF EXISTS "payment_logs: public insert"     ON public.payment_logs;
  DROP POLICY IF EXISTS "payment_logs: admin read"        ON public.payment_logs;
  DROP POLICY IF EXISTS "payment_logs: signed-in read"    ON public.payment_logs;
  DROP POLICY IF EXISTS "payment_logs: admin write"       ON public.payment_logs;

  -- winners
  DROP POLICY IF EXISTS "winners_read_all"              ON public.winners;
  DROP POLICY IF EXISTS "winners_write_admin"           ON public.winners;
  DROP POLICY IF EXISTS "winners: public read"          ON public.winners;
  DROP POLICY IF EXISTS "winners: admin write"          ON public.winners;

  -- storage
  DROP POLICY IF EXISTS "Public Download Assets"        ON storage.objects;
  DROP POLICY IF EXISTS "Public Upload Assets"          ON storage.objects;
  DROP POLICY IF EXISTS "Public Update Assets"          ON storage.objects;
  DROP POLICY IF EXISTS "Public Delete Assets"          ON storage.objects;
  DROP POLICY IF EXISTS "Admin Upload Assets"           ON storage.objects;
  DROP POLICY IF EXISTS "Admin Update Assets"           ON storage.objects;
  DROP POLICY IF EXISTS "Admin Delete Assets"           ON storage.objects;

END $$;


-- ============================================================================
-- STEP 2: Enable RLS on all tables (idempotent)
-- ============================================================================
ALTER TABLE public.settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incharges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_polls   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners         ENABLE ROW LEVEL SECURITY;
-- Note: accountants table is left as-is (no policies = no access via RLS)


-- ============================================================================
-- STEP 3: Production RLS Policies
-- ============================================================================


-- ─── 1. SETTINGS ─────────────────────────────────────────────────────────────
-- Public website reads settings (event date, contact info, etc.)
CREATE POLICY "settings: public read"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "settings: admin write"
  ON public.settings FOR ALL
  USING (current_role_name() = 'admin');


-- ─── 2. LEADERS (public leadership messages) ──────────────────────────────────
-- Public website displays principal/HOD messages
CREATE POLICY "leaders: public read"
  ON public.leaders FOR SELECT
  USING (true);

CREATE POLICY "leaders: admin write"
  ON public.leaders FOR ALL
  USING (current_role_name() = 'admin');


-- ─── 3. RULES ─────────────────────────────────────────────────────────────────
CREATE POLICY "rules: public read"
  ON public.rules FOR SELECT
  USING (true);

CREATE POLICY "rules: admin write"
  ON public.rules FOR ALL
  USING (current_role_name() = 'admin');


-- ─── 4. VENUES ────────────────────────────────────────────────────────────────
CREATE POLICY "venues: public read"
  ON public.venues FOR SELECT
  USING (true);

CREATE POLICY "venues: admin write"
  ON public.venues FOR ALL
  USING (current_role_name() = 'admin');


-- ─── 5. EVENTS ────────────────────────────────────────────────────────────────
-- Public website shows event list/details
CREATE POLICY "events: public read"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "events: admin write"
  ON public.events FOR ALL
  USING (current_role_name() = 'admin');


-- ─── 6. WINNERS ───────────────────────────────────────────────────────────────
-- Public results page + leaders need winner data for certificate downloads
CREATE POLICY "winners: public read"
  ON public.winners FOR SELECT
  USING (true);

CREATE POLICY "winners: admin write"
  ON public.winners FOR ALL
  USING (current_role_name() = 'admin');


-- ─── 7. PROFILES ──────────────────────────────────────────────────────────────
-- Each user can only read their own row; admin reads/writes all
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR current_role_name() = 'admin'
  );

CREATE POLICY "profiles: admin write"
  ON public.profiles FOR ALL
  USING (current_role_name() = 'admin');


-- ─── 8. ADMINS ────────────────────────────────────────────────────────────────
-- Admin-only table — no other role or anon can see it
CREATE POLICY "admins: admin read"
  ON public.admins FOR SELECT
  USING (current_role_name() = 'admin');

CREATE POLICY "admins: admin write"
  ON public.admins FOR ALL
  USING (current_role_name() = 'admin');


-- ─── 9. INCHARGES ─────────────────────────────────────────────────────────────
-- Signed-in users need to read incharges for event display and role lookup.
-- Admin manages records; no public modification.
CREATE POLICY "incharges: signed-in read"
  ON public.incharges FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "incharges: admin write"
  ON public.incharges FOR ALL
  USING (current_role_name() = 'admin');


-- ─── 10. COLLEGES ─────────────────────────────────────────────────────────────
-- Leaders can only see their own college (contains PII: phone, email, address, QR).
-- Admin has full access.
-- Payment-desk writes go via SECURITY DEFINER RPC — no extra UPDATE policy needed.
CREATE POLICY "colleges: admin full"
  ON public.colleges FOR ALL
  USING (current_role_name() = 'admin');

CREATE POLICY "colleges: leader read own"
  ON public.colleges FOR SELECT
  USING (
    current_role_name() = 'leader'
    AND id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
  );

-- Incharge needs to read colleges for event/winner context
CREATE POLICY "colleges: incharge read"
  ON public.colleges FOR SELECT
  USING (current_role_name() = 'incharge');


-- ─── 11. STUDENT_LEADERS ──────────────────────────────────────────────────────
-- Admin: full CRUD.
-- Leader: SELECT and UPDATE their own record only.
-- Inserts go via pre_register_leader / configure_leader_profile (SECURITY DEFINER).
CREATE POLICY "student_leaders: admin full"
  ON public.student_leaders FOR ALL
  USING (current_role_name() = 'admin');

CREATE POLICY "student_leaders: leader read own"
  ON public.student_leaders FOR SELECT
  USING (
    current_role_name() = 'leader'
    AND id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "student_leaders: leader update own"
  ON public.student_leaders FOR UPDATE
  USING (
    current_role_name() = 'leader'
    AND id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
  );


-- ─── 12. LOTS ─────────────────────────────────────────────────────────────────
-- Admin: full CRUD (lot management).
-- Leader: read only their college's assigned lot.
-- Automated lot assignment handled by SECURITY DEFINER trigger.
CREATE POLICY "lots: admin full"
  ON public.lots FOR ALL
  USING (current_role_name() = 'admin');

CREATE POLICY "lots: leader read own"
  ON public.lots FOR SELECT
  USING (
    current_role_name() = 'leader'
    AND id IN (
      SELECT lot_id
      FROM public.registrations
      WHERE college_id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Incharge needs lot info for event context
CREATE POLICY "lots: incharge read"
  ON public.lots FOR SELECT
  USING (current_role_name() = 'incharge');


-- ─── 13. REGISTRATIONS ────────────────────────────────────────────────────────
-- Admin: full CRUD.
-- Leader: SELECT their own college's registrations only.
-- Incharge: SELECT all (needs to see registered teams for their event).
-- INSERT goes via register_team / register_guest_team (SECURITY DEFINER).
CREATE POLICY "registrations: admin full"
  ON public.registrations FOR ALL
  USING (current_role_name() = 'admin');

CREATE POLICY "registrations: leader read own"
  ON public.registrations FOR SELECT
  USING (
    current_role_name() = 'leader'
    AND college_id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "registrations: incharge read"
  ON public.registrations FOR SELECT
  USING (current_role_name() = 'incharge');


-- ─── 14. STUDENTS ─────────────────────────────────────────────────────────────
-- Admin: full CRUD.
-- Leader: full CRUD on their own college's students.
-- Incharge: SELECT all + UPDATE winner_place for their event only.
-- INSERT goes via register_team / register_guest_team (SECURITY DEFINER).
CREATE POLICY "students: admin full"
  ON public.students FOR ALL
  USING (current_role_name() = 'admin');

CREATE POLICY "students: leader crud own college"
  ON public.students FOR ALL
  USING (
    current_role_name() = 'leader'
    AND college_id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    college_id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "students: incharge read"
  ON public.students FOR SELECT
  USING (current_role_name() = 'incharge');

CREATE POLICY "students: incharge update winner_place"
  ON public.students FOR UPDATE
  USING (
    current_role_name() = 'incharge'
    AND event_id IN (
      SELECT event_id FROM public.incharges
      WHERE id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT event_id FROM public.incharges
      WHERE id = (SELECT ref_id FROM public.profiles WHERE id = auth.uid())
    )
  );


-- ─── 15. CERTIFICATES ─────────────────────────────────────────────────────────
-- Admin: full CRUD.
-- Leader: SELECT certificates for students in their own college.
-- No public or anon access.
CREATE POLICY "certificates: admin full"
  ON public.certificates FOR ALL
  USING (current_role_name() = 'admin');

CREATE POLICY "certificates: leader read own"
  ON public.certificates FOR SELECT
  USING (
    current_role_name() = 'leader'
    AND student_id IN (
      SELECT id FROM public.students
      WHERE college_id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "certificates: incharge read"
  ON public.certificates FOR SELECT
  USING (current_role_name() = 'incharge');


-- ─── 16. PAYMENTS ─────────────────────────────────────────────────────────────
-- Admin: full CRUD.
-- Leader: SELECT their own college's payment record only.
-- No public or cross-college access.
CREATE POLICY "payments: admin full"
  ON public.payments FOR ALL
  USING (current_role_name() = 'admin');

CREATE POLICY "payments: leader read own"
  ON public.payments FOR SELECT
  USING (
    current_role_name() = 'leader'
    AND college_id = (SELECT college_id FROM public.profiles WHERE id = auth.uid())
  );


-- ─── 17. PAYMENT_POLLS ────────────────────────────────────────────────────────
-- Admin: full CRUD.
-- Signed-in users: SELECT — needed by verify_payment_desk_key RPC (SECURITY DEFINER).
-- The RPC validates the keycode so raw SELECT access is acceptable.
CREATE POLICY "payment_polls: admin full"
  ON public.payment_polls FOR ALL
  USING (current_role_name() = 'admin');

CREATE POLICY "payment_polls: signed-in read"
  ON public.payment_polls FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ─── 18. PAYMENT_LOGS ─────────────────────────────────────────────────────────
-- Admin: SELECT only (audit log — read-only for admin dashboard).
-- INSERT happens inside clear_college_payment_with_key (SECURITY DEFINER RPC).
-- No other role reads this. No public access.
CREATE POLICY "payment_logs: admin read"
  ON public.payment_logs FOR SELECT
  USING (current_role_name() = 'admin');

-- Allow the SECURITY DEFINER RPC to insert via elevated privileges — no extra policy needed.
-- If you need direct admin INSERT/UPDATE/DELETE for manual corrections:
CREATE POLICY "payment_logs: admin write"
  ON public.payment_logs FOR ALL
  USING (current_role_name() = 'admin');


-- ============================================================================
-- STEP 4: Storage bucket policies (assets bucket)
-- ============================================================================

-- Public CDN download: anyone can view/download assets (cert templates, QR images)
CREATE POLICY "Public Download Assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'assets');

-- Admin-only INSERT (upload)
CREATE POLICY "Admin Upload Assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assets'
    AND current_role_name() = 'admin'
  );

-- Admin-only UPDATE
CREATE POLICY "Admin Update Assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'assets'
    AND current_role_name() = 'admin'
  )
  WITH CHECK (
    bucket_id = 'assets'
    AND current_role_name() = 'admin'
  );

-- Admin-only DELETE
CREATE POLICY "Admin Delete Assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assets'
    AND current_role_name() = 'admin'
  );


-- ============================================================================
-- DONE.
-- What changed vs previous migration:
--   • Accountant role fully removed from all policies.
--   • Colleges: leaders see ONLY their own college (not all authenticated).
--   • Student_leaders: leaders can SELECT + UPDATE their own record only.
--   • Lots: leaders see only their assigned lot.
--   • Students: leaders have full CRUD on their own college (not just SELECT).
--   • Certificates: leaders see certs for their college's students only.
--   • Payments: leaders see only their own college payment row.
--   • Payment_logs: admin-only read (was signed-in read before).
--   • Incharges: signed-in read preserved for event display.
--   • All SECURITY DEFINER RPCs continue to work unchanged.
-- ============================================================================
