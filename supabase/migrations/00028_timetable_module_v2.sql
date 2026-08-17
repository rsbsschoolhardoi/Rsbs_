-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timetable sessions (academic versions)
CREATE TABLE IF NOT EXISTS timetable_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g. "2023-24 Fall"
  is_active BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timetable entries
CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES timetable_sessions(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL, -- Monday, Tuesday, etc.
  period_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, class_id, section_id, day_of_week, period_number)
);

-- RLS Policies
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;

-- Subjects policies
CREATE POLICY "Allow anon read subjects" ON subjects FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated read subjects" ON subjects FOR SELECT TO authenticated USING (true);

-- Sessions policies
CREATE POLICY "Allow anon read sessions" ON timetable_sessions FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Allow authenticated read sessions" ON timetable_sessions FOR SELECT TO authenticated USING (is_published = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Entries policies
CREATE POLICY "Allow anon read entries" ON timetable_entries FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM timetable_sessions WHERE id = timetable_entries.session_id AND is_published = true));
CREATE POLICY "Allow authenticated read entries" ON timetable_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM timetable_sessions WHERE id = timetable_entries.session_id AND (is_published = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))));

-- Admin full access (Need to fix the syntax for multiple policies or use one)
CREATE POLICY "Allow admin all subjects" ON subjects FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Allow admin all sessions" ON timetable_sessions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Allow admin all entries" ON timetable_entries FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE timetable_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE timetable_entries;
