-- Add status and passout_date columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS passout_date TIMESTAMP WITH TIME ZONE;

-- Update existing records to 'active' if they are null
UPDATE students SET status = 'active' WHERE status IS NULL;

-- Add index for performance on status queries
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
