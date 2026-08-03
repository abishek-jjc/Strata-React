-- ============================================================================
-- STRATA 2K26 — Accountant Module & Password Verification Schema Update
-- ============================================================================

-- 1. Add active and password columns to accountants table
ALTER TABLE public.accountants 
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.accountants 
ADD COLUMN IF NOT EXISTS password text DEFAULT '123456';

-- 2. Create accountant_passwords reference table
CREATE TABLE IF NOT EXISTS public.accountant_passwords (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid        REFERENCES public.accountants(id) ON DELETE CASCADE,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  password      text        NOT NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.accountant_passwords ENABLE ROW LEVEL SECURITY;

-- Drop legacy policy if exists and set read/write policy for authenticated users
DO $$ BEGIN
  DROP POLICY IF EXISTS "accountant_passwords_all" ON public.accountant_passwords;
END $$;

CREATE POLICY "accountant_passwords_all" 
  ON public.accountant_passwords 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 3. Ensure payment_logs has accountant_id and accountant_name tracking
ALTER TABLE public.payment_logs
ADD COLUMN IF NOT EXISTS accountant_id uuid REFERENCES public.accountants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS accountant_name text;

-- 4. Enable UPDATE policy on colleges table for payment clearance updates
DO $$ BEGIN
  DROP POLICY IF EXISTS "colleges_update_payment" ON public.colleges;
  DROP POLICY IF EXISTS "colleges: accountant update" ON public.colleges;
  DROP POLICY IF EXISTS "colleges: update payment" ON public.colleges;
END $$;

CREATE POLICY "colleges_update_payment"
  ON public.colleges
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

