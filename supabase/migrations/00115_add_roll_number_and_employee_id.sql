-- Add roll_number to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS roll_number TEXT;

-- Add employee_id to teachers table
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.students.roll_number IS 'Admin-assigned Roll Number, independent from login_id and verification_id';
COMMENT ON COLUMN public.teachers.employee_id IS 'Admin-assigned Teacher/Employee ID, independent from login_id';