-- Update all existing students to have their ID cards and certificates visible
UPDATE students 
SET id_card_visible = true, 
    certificate_visible = true
WHERE id_card_visible = false OR certificate_visible = false;

-- Change the default values for future students to be visible by default
ALTER TABLE students ALTER COLUMN id_card_visible SET DEFAULT true;
ALTER TABLE students ALTER COLUMN certificate_visible SET DEFAULT true;

-- Ensure all teachers have a verification_id if any were missed (safety check)
-- Even though we saw none, this ensures future-proofing
UPDATE teachers 
SET verification_id = 'RSBS0' || substring(upper(md5(random()::text)) from 1 for 4)
WHERE verification_id IS NULL OR verification_id = '';

-- Same for students (safety check)
UPDATE students 
SET verification_id = 'RSBS0' || substring(upper(md5(random()::text)) from 1 for 4)
WHERE verification_id IS NULL OR verification_id = '';
