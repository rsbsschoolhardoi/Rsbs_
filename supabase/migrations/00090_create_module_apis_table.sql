-- Table for module-linked specialized Submission APIs
CREATE TABLE module_apis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_name TEXT NOT NULL,
  module_name TEXT NOT NULL, -- e.g. 'admissions', 'students', 'teachers', 'attendance', 'exams', 'notices'
  purpose TEXT DEFAULT 'POST',
  description TEXT,
  api_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT true,
  rate_limit_minute INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE module_apis ENABLE ROW LEVEL SECURITY;

-- Policies for Admins only
CREATE POLICY "Admins can manage module_apis" ON module_apis
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Link api_logs to module_apis
ALTER TABLE api_logs ADD COLUMN module_api_id UUID REFERENCES module_apis(id);

-- Update api_logs policies to include module_api_id visibility if needed
-- (Current policies are already admin-wide based on previous session)
