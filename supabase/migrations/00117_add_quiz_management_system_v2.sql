-- Migration: add_quiz_management_system_v2
-- Adds quiz tables, RLS policies, helper functions and RPCs for the RSBS Quiz module.

-- ───────────────────────────────────────────────────────────────────────────────
-- Helper functions
-- ───────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role IN ('admin', 'super_admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_id_for_user(uid uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  SELECT student_id INTO v_student_id FROM public.profiles WHERE id = uid;
  RETURN v_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_quiz_assigned_to_student(p_quiz_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id uuid;
  v_section_id uuid;
BEGIN
  SELECT class_id, section_id INTO v_class_id, v_section_id
  FROM public.students WHERE id = p_student_id;

  RETURN EXISTS (
    SELECT 1 FROM public.quiz_assignments
    WHERE quiz_id = p_quiz_id
      AND (
        (target_type = 'student' AND target_id = p_student_id)
        OR (target_type = 'section' AND target_id = v_section_id)
        OR (target_type = 'class' AND target_id = v_class_id)
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_quiz_visible_to_student(p_quiz_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_end_at timestamptz;
BEGIN
  SELECT status, end_at INTO v_status, v_end_at
  FROM public.quizzes WHERE id = p_quiz_id;

  IF v_status IS NULL THEN RETURN false; END IF;
  IF v_status IN ('draft', 'preview', 'archived', 'completed') THEN RETURN false; END IF;
  IF v_end_at IS NOT NULL AND v_end_at < now() THEN RETURN false; END IF;

  RETURN public.is_quiz_assigned_to_student(p_quiz_id, p_student_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_attempt_owner(p_attempt_id uuid, p_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE id = p_attempt_id AND student_id = public.get_student_id_for_user(p_uid)
  );
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────────
-- Tables
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid DEFAULT public.current_user_school_id(auth.uid()),
  title text NOT NULL,
  description text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter text,
  topic text,
  category text,
  academic_session text,
  difficulty text NOT NULL DEFAULT 'medium',
  cover_url text,
  icon text,
  status text NOT NULL DEFAULT 'draft',
  answer_mode text NOT NULL DEFAULT 'instant',
  timer_seconds integer,
  passing_percentage integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 1,
  negative_marks numeric(10,2) NOT NULL DEFAULT 0,
  marks_per_question numeric(10,2) NOT NULL DEFAULT 1,
  random_questions boolean NOT NULL DEFAULT false,
  random_options boolean NOT NULL DEFAULT false,
  allow_navigation boolean NOT NULL DEFAULT true,
  show_explanations boolean NOT NULL DEFAULT true,
  allow_retry boolean NOT NULL DEFAULT false,
  show_result_review boolean NOT NULL DEFAULT true,
  study_ai_enabled boolean NOT NULL DEFAULT true,
  show_leaderboard boolean NOT NULL DEFAULT false,
  number_of_questions integer,
  start_at timestamptz,
  end_at timestamptz,
  appearance jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quizzes_status_check CHECK (status IN ('draft', 'preview', 'published', 'active', 'scheduled', 'completed', 'archived')),
  CONSTRAINT quizzes_answer_mode_check CHECK (answer_mode IN ('instant', 'confirm', 'end')),
  CONSTRAINT quizzes_difficulty_check CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT quizzes_passing_pct_check CHECK (passing_percentage BETWEEN 0 AND 100),
  CONSTRAINT quizzes_timer_seconds_check CHECK (timer_seconds IS NULL OR timer_seconds > 0)
);

CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  image_url text,
  explanation text,
  marks numeric(10,2) NOT NULL DEFAULT 1,
  difficulty text NOT NULL DEFAULT 'medium',
  subject text,
  chapter text,
  topic text,
  question_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_assignments_target_type_check CHECK (target_type IN ('class', 'section', 'student')),
  UNIQUE (quiz_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  score numeric(10,2) NOT NULL DEFAULT 0,
  total_marks numeric(10,2) NOT NULL DEFAULT 0,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  incorrect_count integer NOT NULL DEFAULT 0,
  unanswered_count integer NOT NULL DEFAULT 0,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  attempt_number integer NOT NULL DEFAULT 1,
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_attempts_status_check CHECK (status IN ('in_progress', 'completed', 'expired'))
);

CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.question_options(id) ON DELETE SET NULL,
  is_correct boolean,
  marks_obtained numeric(10,2),
  time_spent_seconds integer NOT NULL DEFAULT 0,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.quiz_ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL DEFAULT public.get_student_id_for_user(auth.uid()) REFERENCES public.students(id),
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ───────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_quizzes_school_status ON public.quizzes(school_id, status);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON public.quizzes(subject_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_order ON public.questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_options_question ON public.question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz ON public.quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_target ON public.quiz_assignments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_student ON public.quiz_attempts(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_status ON public.quiz_attempts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON public.attempt_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_ai_interactions_attempt ON public.quiz_ai_interactions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_ai_interactions_question ON public.quiz_ai_interactions(question_id);

-- ───────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ───────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_ai_interactions ENABLE ROW LEVEL SECURITY;

-- Quizzes
CREATE POLICY quizzes_admin_all ON public.quizzes
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY quizzes_student_select ON public.quizzes
  FOR SELECT TO authenticated
  USING (public.is_quiz_visible_to_student(id, public.get_student_id_for_user(auth.uid())));

CREATE POLICY quizzes_anon_select ON public.quizzes
  FOR SELECT TO anon
  USING (false);

-- Questions
CREATE POLICY questions_admin_all ON public.questions
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY questions_student_select ON public.questions
  FOR SELECT TO authenticated
  USING (false);

CREATE POLICY questions_anon_select ON public.questions
  FOR SELECT TO anon
  USING (false);

-- Question options
CREATE POLICY options_admin_all ON public.question_options
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY options_student_select ON public.question_options
  FOR SELECT TO authenticated
  USING (false);

CREATE POLICY options_anon_select ON public.question_options
  FOR SELECT TO anon
  USING (false);

-- Quiz assignments
CREATE POLICY assignments_admin_all ON public.quiz_assignments
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY assignments_student_select ON public.quiz_assignments
  FOR SELECT TO authenticated
  USING (false);

CREATE POLICY assignments_anon_select ON public.quiz_assignments
  FOR SELECT TO anon
  USING (false);

-- Quiz attempts
CREATE POLICY attempts_admin_all ON public.quiz_attempts
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY attempts_student_select ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (public.is_attempt_owner(id, auth.uid()));

CREATE POLICY attempts_student_insert ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_student_id_for_user(auth.uid()) IS NOT NULL
    AND student_id = public.get_student_id_for_user(auth.uid())
    AND profile_id = auth.uid()
  );

CREATE POLICY attempts_student_update ON public.quiz_attempts
  FOR UPDATE TO authenticated
  USING (public.is_attempt_owner(id, auth.uid()))
  WITH CHECK (public.is_attempt_owner(id, auth.uid()));

CREATE POLICY attempts_student_delete ON public.quiz_attempts
  FOR DELETE TO authenticated
  USING (false);

CREATE POLICY attempts_anon_select ON public.quiz_attempts
  FOR SELECT TO anon
  USING (false);

-- Attempt answers
CREATE POLICY answers_admin_all ON public.attempt_answers
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY answers_student_select ON public.attempt_answers
  FOR SELECT TO authenticated
  USING (false);

CREATE POLICY answers_student_insert ON public.attempt_answers
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY answers_student_update ON public.attempt_answers
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY answers_student_delete ON public.attempt_answers
  FOR DELETE TO authenticated
  USING (false);

CREATE POLICY answers_anon_select ON public.attempt_answers
  FOR SELECT TO anon
  USING (false);

-- Quiz AI interactions
CREATE POLICY ai_interactions_admin_all ON public.quiz_ai_interactions
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY ai_interactions_student_select ON public.quiz_ai_interactions
  FOR SELECT TO authenticated
  USING (public.is_attempt_owner(attempt_id, auth.uid()));

CREATE POLICY ai_interactions_student_insert ON public.quiz_ai_interactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_attempt_owner(attempt_id, auth.uid())
    AND student_id = public.get_student_id_for_user(auth.uid())
    AND profile_id = auth.uid()
  );

CREATE POLICY ai_interactions_student_update ON public.quiz_ai_interactions
  FOR UPDATE TO authenticated
  USING (public.is_attempt_owner(attempt_id, auth.uid()))
  WITH CHECK (public.is_attempt_owner(attempt_id, auth.uid()));

CREATE POLICY ai_interactions_student_delete ON public.quiz_ai_interactions
  FOR DELETE TO authenticated
  USING (false);

CREATE POLICY ai_interactions_anon_select ON public.quiz_ai_interactions
  FOR SELECT TO anon
  USING (false);

-- ───────────────────────────────────────────────────────────────────────────────
-- RPC / triggers
-- ───────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.start_quiz_attempt(p_quiz_id uuid)
RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_attempt public.quiz_attempts;
  v_max_attempts integer;
  v_attempt_count integer;
BEGIN
  v_student_id := public.get_student_id_for_user(auth.uid());
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Only students can start quiz attempts';
  END IF;
  IF NOT public.is_quiz_visible_to_student(p_quiz_id, v_student_id) THEN
    RAISE EXCEPTION 'Quiz is not available';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id AND student_id = v_student_id AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'You already have an in-progress attempt';
  END IF;

  SELECT max_attempts INTO v_max_attempts FROM public.quizzes WHERE id = p_quiz_id;
  SELECT count(*) INTO v_attempt_count
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND student_id = v_student_id AND is_preview = false;

  IF v_attempt_count >= v_max_attempts THEN
    RAISE EXCEPTION 'Maximum attempts reached for this quiz';
  END IF;

  INSERT INTO public.quiz_attempts (quiz_id, student_id, profile_id, attempt_number, status)
  VALUES (p_quiz_id, v_student_id, auth.uid(), v_attempt_count + 1, 'in_progress')
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_player(p_quiz_id uuid, p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_quiz record;
  v_result jsonb;
BEGIN
  v_student_id := public.get_student_id_for_user(auth.uid());
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'Only students can play quizzes'; END IF;
  IF NOT public.is_attempt_owner(p_attempt_id, auth.uid()) THEN RAISE EXCEPTION 'Invalid attempt'; END IF;

  SELECT random_questions, random_options, number_of_questions, answer_mode
  INTO v_quiz
  FROM public.quizzes WHERE id = p_quiz_id;
  IF v_quiz IS NULL THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  SELECT coalesce(jsonb_agg(q), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      question.id AS question_id,
      question.question_text,
      question.image_url,
      question.marks,
      question.difficulty,
      question.order_index,
      question.explanation,
      (
        SELECT coalesce(jsonb_agg(opt), '[]'::jsonb)
        FROM (
          SELECT o.id AS option_id, o.option_text, o.order_index
          FROM public.question_options o
          WHERE o.question_id = question.id
          ORDER BY CASE WHEN v_quiz.random_options THEN random() ELSE o.order_index END
        ) opt
      ) AS options
    FROM public.questions question
    WHERE question.quiz_id = p_quiz_id
    ORDER BY CASE WHEN v_quiz.random_questions THEN random() ELSE question.order_index END
    LIMIT v_quiz.number_of_questions
  ) q;

  RETURN jsonb_build_object(
    'quiz_id', p_quiz_id,
    'attempt_id', p_attempt_id,
    'answer_mode', v_quiz.answer_mode,
    'questions', v_result
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_option_id uuid,
  p_time_spent_seconds integer DEFAULT 0
)
RETURNS TABLE(selected_option_id uuid, is_correct boolean, marks_obtained numeric, correct_option_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  INSERT INTO public.attempt_answers (attempt_id, question_id, selected_option_id, is_correct, marks_obtained, time_spent_seconds, answered_at)
  VALUES (p_attempt_id, p_question_id, p_option_id, v_is_correct, v_marks_obtained, p_time_spent_seconds, now())
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET
    selected_option_id = p_option_id,
    is_correct = v_is_correct,
    marks_obtained = v_marks_obtained,
    time_spent_seconds = p_time_spent_seconds,
    answered_at = now();

  IF v_answer_mode = 'end' AND v_attempt_status = 'in_progress' THEN
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
      time_spent_seconds = p_time_spent_seconds,
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

CREATE OR REPLACE FUNCTION public.get_quiz_result_review(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_quiz record;
  v_result jsonb;
BEGIN
  IF NOT public.is_attempt_owner(p_attempt_id, auth.uid()) AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF v_attempt IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;

  SELECT show_result_review, show_explanations, answer_mode
  INTO v_quiz
  FROM public.quizzes WHERE id = v_attempt.quiz_id;

  IF NOT public.is_admin_user(auth.uid()) AND v_attempt.status != 'completed' THEN
    RAISE EXCEPTION 'Result not available yet';
  END IF;
  IF NOT public.is_admin_user(auth.uid()) AND NOT v_quiz.show_result_review THEN
    RAISE EXCEPTION 'Review is disabled';
  END IF;

  SELECT jsonb_build_object(
    'attempt', row_to_json(v_attempt),
    'show_explanations', v_quiz.show_explanations,
    'questions', coalesce(jsonb_agg(q), '[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT
      q.id AS question_id,
      q.question_text,
      q.image_url,
      q.explanation,
      q.marks,
      q.order_index,
      a.selected_option_id,
      a.is_correct,
      a.marks_obtained,
      a.time_spent_seconds,
      a.answered_at,
      (SELECT id FROM public.question_options WHERE question_id = q.id AND is_correct = true LIMIT 1) AS correct_option_id,
      (SELECT coalesce(jsonb_agg(opt), '[]'::jsonb) FROM (
        SELECT id, option_text, order_index FROM public.question_options WHERE question_id = q.id ORDER BY order_index
      ) opt) AS options
    FROM public.questions q
    LEFT JOIN public.attempt_answers a ON a.question_id = q.id AND a.attempt_id = p_attempt_id
    WHERE q.quiz_id = v_attempt.quiz_id
    ORDER BY q.order_index
  ) q;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_preview_data(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'quiz', row_to_json(quizzes),
      'questions', coalesce((
        SELECT jsonb_agg(q)
        FROM (
          SELECT
            q.id,
            q.question_text,
            q.image_url,
            q.explanation,
            q.marks,
            q.order_index,
            (SELECT coalesce(jsonb_agg(opt), '[]'::jsonb) FROM (
              SELECT id, option_text, is_correct, order_index
              FROM public.question_options
              WHERE question_id = q.id
              ORDER BY order_index
            ) opt) AS options
          FROM public.questions q
          WHERE q.quiz_id = p_quiz_id
          ORDER BY q.order_index
        ) q
      ), '[]'::jsonb)
    )
    FROM public.quizzes
    WHERE id = p_quiz_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_analytics(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT jsonb_build_object(
    'quiz_id', p_quiz_id,
    'assigned', (SELECT count(*) FROM public.quiz_assignments WHERE quiz_id = p_quiz_id),
    'started', (SELECT count(*) FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND is_preview = false AND status IN ('in_progress', 'completed', 'expired')),
    'completed', (SELECT count(*) FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND is_preview = false AND status = 'completed'),
    'average_score', (SELECT round(avg(percentage), 2) FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND is_preview = false AND status = 'completed'),
    'highest_score', (SELECT max(percentage) FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND is_preview = false AND status = 'completed'),
    'lowest_score', (SELECT min(percentage) FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND is_preview = false AND status = 'completed'),
    'average_time_seconds', (SELECT round(avg(time_spent_seconds), 0) FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND is_preview = false AND status = 'completed'),
    'pass_percentage', (SELECT round(
      count(*) FILTER (WHERE qa.percentage >= q.passing_percentage)::numeric / nullif(count(*), 0) * 100, 2)
      FROM public.quiz_attempts qa
      JOIN public.quizzes q ON q.id = qa.quiz_id
      WHERE qa.quiz_id = p_quiz_id AND qa.is_preview = false AND qa.status = 'completed'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_question_wise_analytics(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT coalesce(jsonb_agg(q), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      q.id AS question_id,
      q.question_text,
      q.difficulty,
      count(a.id) AS total_attempts,
      count(a.id) FILTER (WHERE a.is_correct = true) AS correct_count,
      count(a.id) FILTER (WHERE a.is_correct = false) AS incorrect_count,
      round(
        count(a.id) FILTER (WHERE a.is_correct = true)::numeric
        / nullif(count(a.id), 0) * 100, 2
      ) AS accuracy,
      (SELECT coalesce(jsonb_agg(opt), '[]'::jsonb) FROM (
        SELECT o.option_text,
               count(a2.id) AS selected_count
        FROM public.question_options o
        LEFT JOIN public.attempt_answers a2 ON a2.selected_option_id = o.id AND a2.attempt_id IN (
          SELECT id FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND status = 'completed' AND is_preview = false
        )
        WHERE o.question_id = q.id
        GROUP BY o.id, o.option_text
        ORDER BY o.order_index
      ) opt) AS option_stats
    FROM public.questions q
    LEFT JOIN public.attempt_answers a ON a.question_id = q.id AND a.attempt_id IN (
      SELECT id FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND status = 'completed' AND is_preview = false
    )
    WHERE q.quiz_id = p_quiz_id
    GROUP BY q.id, q.question_text, q.difficulty, q.order_index
    ORDER BY q.order_index
  ) q;

  RETURN v_result;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────────
-- Module registration and default permission seeding
-- ───────────────────────────────────────────────────────────────────────────────

INSERT INTO public.modules (id, label)
VALUES ('quizzes', 'Quizzes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_settings (module_id, is_enabled, state)
SELECT 'quizzes', true, 'enabled'
WHERE NOT EXISTS (
  SELECT 1 FROM public.module_settings WHERE module_id = 'quizzes'
);

-- Add the 'quizzes' permission to every admin profile so the module is accessible by default.
UPDATE public.profiles
SET permissions = array_append(coalesce(permissions, '{}'), 'quizzes')
WHERE role IN ('admin', 'super_admin')
  AND NOT ('quizzes' = ANY(coalesce(permissions, '{}')));
