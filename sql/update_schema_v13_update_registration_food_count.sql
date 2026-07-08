-- ============================================================================
-- STRATA — Database Update Script v13 (Update Registration Food Count RPC)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ============================================================================

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
  UPDATE public.registrations
     SET veg_count = p_veg_count,
         nonveg_count = p_nonveg_count
   WHERE id = p_registration_id;
END;
$$;
