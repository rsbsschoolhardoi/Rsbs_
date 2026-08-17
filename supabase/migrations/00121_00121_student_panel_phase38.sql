-- Phase 38: Student Panel fixes & admin-customizable Account/Settings content

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Quiz progress persistence columns
-- ───────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS current_question_index integer NOT NULL DEFAULT 0;

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. Save-quiz-progress RPC
-- ───────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_quiz_progress(
  p_attempt_id uuid,
  p_current_question_index integer,
  p_time_spent_seconds integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_attempt_owner(p_attempt_id, auth.uid()) THEN
    RAISE EXCEPTION 'Invalid attempt';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE id = p_attempt_id AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'Attempt is not in progress';
  END IF;

  UPDATE public.quiz_attempts
  SET current_question_index = p_current_question_index,
      time_spent_seconds = p_time_spent_seconds,
      updated_at = now()
  WHERE id = p_attempt_id;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. Hardened save_answer RPC
--    - persists current question index on every answer
--    - persists cumulative time spent on every answer
--    - enforces quiz window visibility so closed quizzes cannot be answered
-- ───────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.save_answer(uuid, uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.save_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_option_id uuid,
  p_time_spent_seconds integer DEFAULT 0,
  p_current_question_index integer DEFAULT 0
)
RETURNS TABLE (
  selected_option_id uuid,
  is_correct boolean,
  marks_obtained numeric,
  correct_option_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_quiz_id uuid;
  v_answer_mode text;
  v_attempt_status text;
  v_marks_per_question numeric;
  v_negative_marks numeric;
  v_is_correct boolean;
  v_correct_option_id uuid;
  v_marks_obtained numeric;
  v_return_is_correct boolean;
  v_return_marks numeric;
  v_return_correct_id uuid;
BEGIN
  IF NOT public.is_attempt_owner(p_attempt_id, auth.uid()) THEN
    RAISE EXCEPTION 'Invalid attempt';
  END IF;

  SELECT quiz_id, status INTO v_quiz_id, v_attempt_status
  FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF v_quiz_id IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF v_attempt_status != 'in_progress' THEN RAISE EXCEPTION 'Attempt is already submitted'; END IF;

  SELECT student_id INTO v_student_id FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF NOT public.is_quiz_visible_to_student(v_quiz_id, v_student_id) THEN
    RAISE EXCEPTION 'Quiz is no longer available';
  END IF;

  SELECT answer_mode, marks_per_question, negative_marks
  INTO v_answer_mode, v_marks_per_question, v_negative_marks
  FROM public.quizzes WHERE id = v_quiz_id;

  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id = p_question_id AND quiz_id = v_quiz_id) THEN
    RAISE EXCEPTION 'Question does not belong to quiz';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.question_options WHERE id = p_option_id AND question_id = p_question_id) THEN
    RAISE EXCEPTION 'Option does not belong to question';
  END IF;

  SELECT id INTO v_correct_option_id
  FROM public.question_options
  WHERE question_id = p_question_id AND is_correct = true
  LIMIT 1;

  v_is_correct := (p_option_id = v_correct_option_id);
  v_marks_obtained := CASE WHEN v_is_correct THEN v_marks_per_question ELSE -v_negative_marks END;

  INSERT INTO public.attempt_answers (
    attempt_id, question_id, selected_option_id, is_correct, marks_obtained, time_spent_seconds, answered_at
  )
  VALUES (
    p_attempt_id, p_question_id, p_option_id, v_is_correct, v_marks_obtained,
    COALESCE(p_time_spent_seconds, 0), now()
  )
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET
    selected_option_id = p_option_id,
    is_correct = v_is_correct,
    marks_obtained = v_marks_obtained,
    time_spent_seconds = COALESCE(p_time_spent_seconds, 0),
    answered_at = now();

  UPDATE public.quiz_attempts
  SET current_question_index = p_current_question_index,
      time_spent_seconds = COALESCE(p_time_spent_seconds, 0),
      updated_at = now()
  WHERE id = p_attempt_id;

  IF v_answer_mode = 'end' THEN
    v_return_is_correct := NULL;
    v_return_marks := NULL;
    v_return_correct_id := NULL;
  ELSE
    v_return_is_correct := v_is_correct;
    v_return_marks := v_marks_obtained;
    v_return_correct_id := v_correct_option_id;
  END IF;

  RETURN QUERY SELECT p_option_id, v_return_is_correct, v_return_marks, v_return_correct_id;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. Enforce quiz window on final submission
-- ───────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_attempt_id uuid,
  p_time_spent_seconds integer DEFAULT 0
)
RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_quiz_id uuid;
  v_student_id uuid;
  v_total_questions integer;
  v_answered integer;
  v_correct integer;
  v_incorrect integer;
  v_score numeric;
  v_total_marks numeric;
  v_percentage numeric;
  v_passing integer;
BEGIN
  IF NOT public.is_attempt_owner(p_attempt_id, auth.uid()) THEN
    RAISE EXCEPTION 'Invalid attempt';
  END IF;

  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF v_attempt.status != 'in_progress' THEN RAISE EXCEPTION 'Attempt already submitted'; END IF;
  v_quiz_id := v_attempt.quiz_id;
  v_student_id := v_attempt.student_id;

  IF NOT public.is_quiz_visible_to_student(v_quiz_id, v_student_id) THEN
    RAISE EXCEPTION 'Quiz is no longer available';
  END IF;

  SELECT count(*) INTO v_total_questions FROM public.questions WHERE quiz_id = v_quiz_id;
  SELECT count(*) INTO v_answered FROM public.attempt_answers WHERE attempt_id = p_attempt_id;
  SELECT count(*) INTO v_correct FROM public.attempt_answers WHERE attempt_id = p_attempt_id AND is_correct = true;
  SELECT count(*) INTO v_incorrect FROM public.attempt_answers WHERE attempt_id = p_attempt_id AND is_correct = false;
  SELECT coalesce(sum(marks_obtained), 0) INTO v_score FROM public.attempt_answers WHERE attempt_id = p_attempt_id;
  SELECT coalesce(sum(marks), 0) INTO v_total_marks FROM public.questions WHERE quiz_id = v_quiz_id;
  SELECT passing_percentage INTO v_passing FROM public.quizzes WHERE id = v_quiz_id;

  IF v_total_marks = 0 THEN v_total_marks := 1; END IF;
  v_percentage := round((v_score / v_total_marks) * 100, 2);

  UPDATE public.quiz_attempts
  SET status = 'completed',
      submitted_at = now(),
      time_spent_seconds = COALESCE(p_time_spent_seconds, 0),
      score = v_score,
      total_marks = v_total_marks,
      percentage = v_percentage,
      correct_count = v_correct,
      incorrect_count = v_incorrect,
      unanswered_count = v_total_questions - v_answered,
      updated_at = now()
  WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. Allow attempt owners to read their own answers (fixes resume of selections)
--    Inserts/updates are still performed via SECURITY DEFINER RPCs.
-- ───────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS answers_student_select ON public.attempt_answers;
CREATE POLICY answers_student_select ON public.attempt_answers
  FOR SELECT TO authenticated
  USING (public.is_attempt_owner(attempt_id, auth.uid()));

-- ───────────────────────────────────────────────────────────────────────────────
-- 6. Generic updated_at trigger for new tables
-- ───────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 7. Admin-customizable Student Panel content tables
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_panel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid DEFAULT public.current_user_school_id(auth.uid()),
  key text NOT NULL,
  label text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'text', -- text, toggle, select, textarea
  options jsonb DEFAULT '[]'::jsonb,
  value jsonb DEFAULT 'null'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_panel_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid DEFAULT public.current_user_school_id(auth.uid()),
  key text NOT NULL,
  label text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'push', -- push, email, sms, in_app
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_panel_help_support (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid DEFAULT public.current_user_school_id(auth.uid()),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'General',
  contact_email text,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_panel_privacy_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid DEFAULT public.current_user_school_id(auth.uid()),
  title text NOT NULL DEFAULT 'Privacy Policy',
  content text NOT NULL,
  version text DEFAULT '1.0',
  effective_date date DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique keys per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_panel_settings_school_key
  ON public.student_panel_settings (school_id, key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_panel_notifications_school_key
  ON public.student_panel_notifications (school_id, key);

-- Updated_at triggers
CREATE TRIGGER trg_student_panel_settings_updated_at
  BEFORE UPDATE ON public.student_panel_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_student_panel_notifications_updated_at
  BEFORE UPDATE ON public.student_panel_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_student_panel_help_support_updated_at
  BEFORE UPDATE ON public.student_panel_help_support
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_student_panel_privacy_policy_updated_at
  BEFORE UPDATE ON public.student_panel_privacy_policy
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

-- Enable Realtime so student panel reflects changes instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_panel_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_panel_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_panel_help_support;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_panel_privacy_policy;

-- ───────────────────────────────────────────────────────────────────────────────
-- 8. RLS policies for content tables
-- ───────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.student_panel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_panel_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_panel_help_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_panel_privacy_policy ENABLE ROW LEVEL SECURITY;

-- Admin: full CRUD on their own school
DROP POLICY IF EXISTS student_panel_settings_admin_all ON public.student_panel_settings;
CREATE POLICY student_panel_settings_admin_all ON public.student_panel_settings
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()) AND school_id = public.current_user_school_id(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()) AND school_id = public.current_user_school_id(auth.uid()));

DROP POLICY IF EXISTS student_panel_notifications_admin_all ON public.student_panel_notifications;
CREATE POLICY student_panel_notifications_admin_all ON public.student_panel_notifications
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()) AND school_id = public.current_user_school_id(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()) AND school_id = public.current_user_school_id(auth.uid()));

DROP POLICY IF EXISTS student_panel_help_support_admin_all ON public.student_panel_help_support;
CREATE POLICY student_panel_help_support_admin_all ON public.student_panel_help_support
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()) AND school_id = public.current_user_school_id(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()) AND school_id = public.current_user_school_id(auth.uid()));

DROP POLICY IF EXISTS student_panel_privacy_policy_admin_all ON public.student_panel_privacy_policy;
CREATE POLICY student_panel_privacy_policy_admin_all ON public.student_panel_privacy_policy
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()) AND school_id = public.current_user_school_id(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()) AND school_id = public.current_user_school_id(auth.uid()));

-- Student: read active rows for their own school
DROP POLICY IF EXISTS student_panel_settings_student_read ON public.student_panel_settings;
CREATE POLICY student_panel_settings_student_read ON public.student_panel_settings
  FOR SELECT TO authenticated
  USING (is_active = true AND school_id = public.current_user_school_id(auth.uid()));

DROP POLICY IF EXISTS student_panel_notifications_student_read ON public.student_panel_notifications;
CREATE POLICY student_panel_notifications_student_read ON public.student_panel_notifications
  FOR SELECT TO authenticated
  USING (is_active = true AND school_id = public.current_user_school_id(auth.uid()));

DROP POLICY IF EXISTS student_panel_help_support_student_read ON public.student_panel_help_support;
CREATE POLICY student_panel_help_support_student_read ON public.student_panel_help_support
  FOR SELECT TO authenticated
  USING (is_active = true AND school_id = public.current_user_school_id(auth.uid()));

DROP POLICY IF EXISTS student_panel_privacy_policy_student_read ON public.student_panel_privacy_policy;
CREATE POLICY student_panel_privacy_policy_student_read ON public.student_panel_privacy_policy
  FOR SELECT TO authenticated
  USING (is_active = true AND school_id = public.current_user_school_id(auth.uid()));

-- ───────────────────────────────────────────────────────────────────────────────
-- 9. Seed default content for the first school
-- ───────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_school_id uuid;
BEGIN
  SELECT id INTO v_school_id FROM public.schools ORDER BY created_at LIMIT 1;
  IF v_school_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.student_panel_settings (school_id, key, label, description, type, value, sort_order)
  VALUES
    (v_school_id, 'language', 'Default Language', 'Preferred language for the student portal.', 'select', '"english"', 1),
    (v_school_id, 'theme', 'Default Theme', 'Choose between light and dark mode.', 'select', '"light"', 2),
    (v_school_id, 'show_timetable', 'Show Timetable', 'Display your class timetable on the dashboard.', 'toggle', 'true', 3)
  ON CONFLICT (school_id, key) DO NOTHING;

  INSERT INTO public.student_panel_notifications (school_id, key, label, description, channel, sort_order)
  VALUES
    (v_school_id, 'fee_reminders', 'Fee Reminders', 'Get notified when a fee payment is due.', 'push', 1),
    (v_school_id, 'exam_results', 'Exam Results', 'Receive a notification when new exam results are published.', 'push', 2),
    (v_school_id, 'notices', 'School Notices', 'Important announcements from the school.', 'push', 3),
    (v_school_id, 'attendance_alerts', 'Attendance Alerts', 'Notify guardians about daily attendance.', 'email', 4)
  ON CONFLICT (school_id, key) DO NOTHING;

  INSERT INTO public.student_panel_help_support (school_id, title, content, category, contact_email, contact_phone, sort_order)
  VALUES
    (v_school_id, 'How do I reset my PIN?', 'Go to Account & Settings → Security PIN → Change PIN. You will need your current PIN to create a new one.', 'Account', 'support@rsbs.school', '+91-12345-67890', 1),
    (v_school_id, 'Where can I see my fee receipts?', 'Open the Fees tab, then switch to the Receipts tab to view and download all your payment receipts.', 'Fees', 'support@rsbs.school', '+91-12345-67890', 2),
    (v_school_id, 'How do I use Study AI?', 'Tap Study AI, ask a question in the chat, and the AI will help you learn the topic. Your daily limit is shown in the header.', 'Study', 'support@rsbs.school', '+91-12345-67890', 3)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.student_panel_privacy_policy (school_id, title, content, version, effective_date)
  VALUES
    (v_school_id, 'Privacy Policy', 'We value your privacy. Your personal data is used only to provide school services, including attendance, fees, quizzes, and communication. We do not share your data with third parties except as required by law. Contact the school administration for any privacy-related questions.', '1.0', CURRENT_DATE)
  ON CONFLICT DO NOTHING;
END;
$$;