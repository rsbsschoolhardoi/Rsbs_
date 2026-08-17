-- 1. Add 'parent' role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';

-- 2. Update profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_profile_id uuid; -- Rename to avoid confusion with parent_id text in parents table

-- 3. Create parents table
CREATE TABLE IF NOT EXISTS public.parents (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id text UNIQUE NOT NULL, -- Format like RSBS-P-XXXX
  full_name text NOT NULL,
  phone text,
  email text,
  occupation text,
  address text,
  gender text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create junction table
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES parents(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  relationship text, -- Father, Mother, Guardian, etc.
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- 5. Add toggles to module_settings
INSERT INTO public.module_settings (module_id, is_enabled, state)
VALUES 
  ('parents', true, 'enabled'),
  ('parent_portal_visibility', true, 'enabled'),
  ('parent_help_desk', true, 'enabled'),
  ('parent_feedback', true, 'enabled'),
  ('parent_appointments', true, 'enabled')
ON CONFLICT (module_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- 6. RLS Policies
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins have full access to parents') THEN
        CREATE POLICY "Admins have full access to parents" ON parents
          FOR ALL TO authenticated USING (is_admin(auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view their own profile') THEN
        CREATE POLICY "Parents can view their own profile" ON parents
          FOR SELECT TO authenticated USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins have full access to parent_student_links') THEN
        CREATE POLICY "Admins have full access to parent_student_links" ON parent_student_links
          FOR ALL TO authenticated USING (is_admin(auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view their own links') THEN
        CREATE POLICY "Parents can view their own links" ON parent_student_links
          FOR SELECT TO authenticated USING (auth.uid() = parent_id);
    END IF;
END $$;
