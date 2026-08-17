-- Add Early Leave settings to attendance_config
ALTER TABLE attendance_config 
ADD COLUMN IF NOT EXISTS early_leave_start_time TIME DEFAULT '12:00:00',
ADD COLUMN IF NOT EXISTS early_leave_end_time TIME DEFAULT '16:00:00',
ADD COLUMN IF NOT EXISTS is_early_leave_restriction_enabled BOOLEAN DEFAULT false;

-- Create early_leaves table
CREATE TABLE IF NOT EXISTS early_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    exit_time TIME NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, date)
);

-- Enable RLS
ALTER TABLE early_leaves ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Early leaves are viewable by everyone" 
ON early_leaves FOR SELECT 
USING (true);

CREATE POLICY "Early leaves can be inserted by admins and teachers" 
ON early_leaves FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
);

CREATE POLICY "Early leaves can be updated by admins" 
ON early_leaves FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Early leaves can be deleted by admins" 
ON early_leaves FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Grant access
GRANT ALL ON early_leaves TO anon, authenticated, service_role;
