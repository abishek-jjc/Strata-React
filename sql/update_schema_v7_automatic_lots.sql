-- ========================================================================
-- STRATA — Database Update Script v7 (Automatic Lot Assignment & Migration)
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- ========================================================================

-- 1. MIGRATE EXISTING DATA
DO $$
DECLARE
  r_college RECORD;
  v_lot_id uuid;
  v_lot_name text;
BEGIN
  -- Loop through all colleges that have registrations
  FOR r_college IN 
    SELECT DISTINCT c.id, c.college 
      FROM colleges c 
      JOIN registrations reg ON reg.college_id = c.id
  LOOP
    -- Check if this college already has a lot assigned in the lots table
    SELECT id, lot_name INTO v_lot_id, v_lot_name 
      FROM lots 
     WHERE lower(trim(assigned_college)) = lower(trim(r_college.college)) 
     LIMIT 1;

    -- If no lot is assigned, find the first unassigned lot and allocate it
    IF v_lot_id IS NULL THEN
      SELECT id, lot_name INTO v_lot_id, v_lot_name 
        FROM lots 
       WHERE is_assigned = false 
       ORDER BY lot_name ASC 
       LIMIT 1;

      -- Assign it to the college if one was found
      IF v_lot_id IS NOT NULL THEN
        UPDATE lots 
           SET is_assigned = true, 
               assigned_college = r_college.college 
         WHERE id = v_lot_id;
      END IF;
    END IF;

    -- If a lot is allocated (either existing or newly assigned),
    -- update all registrations for this college to reference this lot.
    IF v_lot_id IS NOT NULL THEN
      UPDATE registrations
         SET lot_id = v_lot_id,
             status = CASE WHEN status = 'pending' THEN 'lot_assigned' ELSE status END
       WHERE college_id = r_college.id;
    END IF;
  END LOOP;
END $$;


-- 2. CREATE AUTOMATIC LOT ASSIGNMENT TRIGGER FOR FUTURE REGISTRATIONS
CREATE OR REPLACE FUNCTION assign_lot_automatically()
RETURNS TRIGGER AS $$
DECLARE
  v_college_name text;
  v_lot_id uuid;
BEGIN
  -- Retrieve the college name for the registration
  SELECT college INTO v_college_name 
    FROM colleges 
   WHERE id = NEW.college_id;
  
  IF v_college_name IS NOT NULL THEN
    -- Check if the college already has an allocated lot
    SELECT id INTO v_lot_id 
      FROM lots 
     WHERE lower(trim(assigned_college)) = lower(trim(v_college_name)) 
     LIMIT 1;
    
    -- If no lot is assigned yet, find the first available unassigned lot
    IF v_lot_id IS NULL THEN
      SELECT id INTO v_lot_id 
        FROM lots 
       WHERE is_assigned = false 
       ORDER BY lot_name ASC 
       LIMIT 1;
      
      -- Allocate the lot to the college name
      IF v_lot_id IS NOT NULL THEN
        UPDATE lots 
           SET is_assigned = true, 
               assigned_college = v_college_name 
         WHERE id = v_lot_id;
      END IF;
    END IF;
    
    -- If a lot is available, associate it with this registration and status
    IF v_lot_id IS NOT NULL THEN
      NEW.lot_id := v_lot_id;
      -- Move from pending to lot_assigned automatically
      IF NEW.status = 'pending' THEN
        NEW.status := 'lot_assigned';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists to avoid conflict
DROP TRIGGER IF EXISTS trg_assign_lot_automatically ON registrations;

-- Create the trigger before insert to set lot_id and status on NEW row directly
CREATE TRIGGER trg_assign_lot_automatically
BEFORE INSERT ON registrations
FOR EACH ROW
EXECUTE FUNCTION assign_lot_automatically();
