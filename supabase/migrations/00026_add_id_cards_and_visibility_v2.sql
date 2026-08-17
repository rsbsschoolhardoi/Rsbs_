-- Migration for ID Cards and Visibility Fix
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'certificate';
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS reference_number text;

-- Update existing certificates
UPDATE certificates SET reference_number = 'CERT-' || UPPER(SUBSTRING(id::text, 1, 8)) WHERE reference_number IS NULL;

-- Fix unique constraint
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_student_id_key;
-- If already exist, drop and recreate
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_student_id_document_type_key;
ALTER TABLE certificates ADD CONSTRAINT certificates_student_id_document_type_key UNIQUE (student_id, document_type);

-- Update students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS id_card_visible boolean DEFAULT false;