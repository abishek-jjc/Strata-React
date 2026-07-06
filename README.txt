========================================================================
STRATA — React + Supabase source
========================================================================

SETUP

  1. Create a project at https://supabase.com
  2. In the SQL Editor, run supabase/schema.sql in full. This creates
     every table, the RLS policies, and the register_team() function
     that the team-registration flow depends on.
  3. npm install
  4. Copy .env.local.example to .env.local and fill in:
       VITE_SUPABASE_URL          (Project Settings > API)
       VITE_SUPABASE_ANON_KEY     (Project Settings > API)
       VITE_QR_SECRET_KEY         (any long random string)
  5. Deploy the Edge Function that provisions leader/accountant
     accounts (see "WHY AN EDGE FUNCTION" below):
       supabase login
       supabase link --project-ref <your-project-ref>
       supabase functions deploy create-user
     The function reads SUPABASE_URL / SUPABASE_ANON_KEY /
     SUPABASE_SERVICE_ROLE_KEY from the environment automatically —
     Supabase sets these for you, no manual secret config needed.
  6. Create your first admin manually:
       a. Authentication > Add user (email + password, confirm email)
       b. Table editor > profiles > insert row:
          id = that user's UID, role = "admin", name = "Your name"
  7. npm run dev

DEPLOY THE FRONTEND

  npm run build
  Deploy the dist/ folder to Vercel, Netlify, or Supabase's own
  static hosting via any static host of your choice — Supabase
  itself only hosts the backend (DB, Auth, Edge Functions), not the
  frontend build.

WHY AN EDGE FUNCTION FOR STUDENT LEADER / ACCOUNTANT ACCOUNTS

  Creating another user's auth account directly from the browser
  (supabase.auth.signUp) signs the browser into that new account,
  which would kick the admin out of their own session — the same
  trap the Firebase version had. supabase/functions/create-user
  fixes this properly: it runs server-side, checks the caller is
  really an admin, then uses the service role key (which never
  reaches the browser) to create the account without touching the
  admin's session at all.

WHAT'S REAL VS WHAT'S A STARTING POINT

  Fully wired and working:
    - Login + role-based routing (admin / leader / accountant)
    - Events, Colleges, Student leaders, Incharges, Accountants, Lots
      — full CRUD against Postgres, realtime via Supabase channels
    - College QR generation: encrypted payload (AES) + downloadable
      QR image, stored as a data URL directly on the colleges row —
      no Storage bucket used
    - Team registration: the actual transactional flow, but this time
      done the Postgres-native way — register_team() is one plpgsql
      function that runs in a single transaction, and the "one
      registration per college per event" + "no duplicate participant
      names anywhere" rules are enforced by real UNIQUE constraints,
      not application-level pre-checks. This is more robust than the
      Firebase version, which had to work around Firestore's lack of
      cross-document uniqueness constraints.
    - Registration review: lot assignment, approve/reject
    - Payment collection: writes a payment row, advances registration
      status, generates a downloadable PDF bill
    - Certificate issuance (admin) and download (leader), generated
      client-side as PDFs
    - Excel export on every list/report screen

  Deliberately left for you to wire up:
    - QR SCANNING screen (html5-qrcode is in package.json, no page
      wired yet) — same gap as the Firebase version.
    - Correction requests (leader editing a team after submission).
    - Today's-registrations / today's-collection date filtering on
      the dashboards (currently all-time totals).
    - Event Details / Profile pages for the leader role are simple
      placeholders.

  See STRATA_REACT_FIREBASE_INSTRUCTIONS.txt for the original
  requirements analysis — everything in it still applies except the
  Firebase-specific sections (Firestore schema, security rules),
  which supabase/schema.sql replaces.
========================================================================
