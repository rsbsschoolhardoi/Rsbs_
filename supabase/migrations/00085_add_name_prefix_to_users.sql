-- Add prefix column to students, parents, and teachers tables
ALTER TABLE students ADD COLUMN IF NOT EXISTS prefix text;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS prefix text;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS prefix text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prefix text;

-- Update existing records to have NULL prefix (already default, but being explicit)
UPDATE students SET prefix = NULL;
UPDATE parents SET prefix = NULL;
UPDATE teachers SET prefix = NULL;
UPDATE profiles SET prefix = NULL;
