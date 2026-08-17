CREATE TABLE IF NOT EXISTS pending_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  permissions text[] DEFAULT '{}',
  is_master boolean DEFAULT false,
  is_blue_tag boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE pending_admins ENABLE ROW LEVEL SECURITY;

-- Allow anonymous check for a specific email (if we want to call it from Verify.tsx)
-- Actually, it's safer to use an Edge Function with Service Role to finalize.
CREATE POLICY "Anyone can look up pending admin by email" ON pending_admins
  FOR SELECT USING (true);

-- Only admins can insert/delete
CREATE POLICY "Admins can manage pending admins" ON pending_admins
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
