-- 1. Create a function to generate the next unique Parent Login ID
CREATE OR REPLACE FUNCTION generate_next_parent_id()
RETURNS TEXT AS $$
DECLARE
  max_id TEXT;
  max_num INTEGER;
  next_id TEXT;
BEGIN
  -- Find the highest numeric suffix currently in use (RSBSP + 4 digits)
  SELECT parent_id INTO max_id
  FROM parents
  WHERE parent_id ~ '^RSBSP[0-9]{4}$'
  ORDER BY parent_id DESC
  LIMIT 1
  FOR UPDATE; -- Lock rows to prevent race conditions during concurrent generation

  IF max_id IS NULL THEN
    max_num := 0;
  ELSE
    max_num := substring(max_id FROM 6)::INTEGER;
  END IF;

  -- Increment the max number by 1
  max_num := max_num + 1;

  -- Check for sequence exhaustion
  IF max_num > 9999 THEN
    RAISE EXCEPTION 'Parent Login ID sequence (0000-9999) has been exhausted.';
  END IF;

  -- Format with padding to 4 digits
  next_id := 'RSBSP' || lpad(max_num::TEXT, 4, '0');

  RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Add CHECK constraint to enforce parent_id format
-- First, cleanup invalid IDs to avoid breaking existing data
UPDATE parents SET parent_id = 'RSBSP0000' WHERE parent_id !~ '^RSBSP[0-9]{4}$';

-- Add the CHECK constraint
ALTER TABLE parents ADD CONSTRAINT parent_id_format_check CHECK (parent_id ~ '^RSBSP[0-9]{4}$');

-- 3. Update profiles table to ensure existing parent login IDs are valid
-- (Assuming profiles table tracks parent_id in username or related field)
UPDATE profiles 
SET username = p.parent_id
FROM parents p
WHERE profiles.parent_profile_id = p.id
AND profiles.username != p.parent_id;

-- 4. Create a trigger function to auto-generate parent_id if not provided
CREATE OR REPLACE FUNCTION set_next_parent_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL OR NEW.parent_id = '' THEN
    NEW.parent_id := generate_next_parent_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach the trigger to the parents table
DROP TRIGGER IF EXISTS tr_set_next_parent_id ON parents;
CREATE TRIGGER tr_set_next_parent_id
BEFORE INSERT ON parents
FOR EACH ROW
EXECUTE FUNCTION set_next_parent_id();

-- 6. Enforce immutability of parent_id
CREATE OR REPLACE FUNCTION enforce_parent_id_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    RAISE EXCEPTION 'Parent Login ID is immutable and cannot be changed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_enforce_parent_id_immutability ON parents;
CREATE TRIGGER tr_enforce_parent_id_immutability
BEFORE UPDATE ON parents
FOR EACH ROW
EXECUTE FUNCTION enforce_parent_id_immutability();
