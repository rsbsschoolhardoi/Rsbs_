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
      CASE WHEN v_quiz.answer_mode = 'end' THEN NULL ELSE
        (SELECT id FROM public.question_options WHERE question_id = question.id AND is_correct = true LIMIT 1)
      END AS correct_option_id,
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
    'quiz_id', v_attempt.quiz_id,
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