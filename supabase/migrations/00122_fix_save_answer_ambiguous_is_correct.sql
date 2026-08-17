CREATE OR REPLACE FUNCTION public.save_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_option_id uuid,
  p_time_spent_seconds integer DEFAULT 0,
  p_current_question_index integer DEFAULT 0
)
RETURNS TABLE(selected_option_id uuid, is_correct boolean, marks_obtained numeric, correct_option_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  SELECT qa.quiz_id, qa.status INTO v_quiz_id, v_attempt_status
  FROM public.quiz_attempts qa WHERE qa.id = p_attempt_id;
  IF v_quiz_id IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF v_attempt_status != 'in_progress' THEN RAISE EXCEPTION 'Attempt is already submitted'; END IF;

  SELECT qa.student_id INTO v_student_id FROM public.quiz_attempts qa WHERE qa.id = p_attempt_id;
  IF NOT public.is_quiz_visible_to_student(v_quiz_id, v_student_id) THEN
    RAISE EXCEPTION 'Quiz is no longer available';
  END IF;

  SELECT q.answer_mode, q.marks_per_question, q.negative_marks
  INTO v_answer_mode, v_marks_per_question, v_negative_marks
  FROM public.quizzes q WHERE q.id = v_quiz_id;

  IF NOT EXISTS (SELECT 1 FROM public.questions qn WHERE qn.id = p_question_id AND qn.quiz_id = v_quiz_id) THEN
    RAISE EXCEPTION 'Question does not belong to quiz';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.question_options qo WHERE qo.id = p_option_id AND qo.question_id = p_question_id) THEN
    RAISE EXCEPTION 'Option does not belong to question';
  END IF;

  SELECT qo.id INTO v_correct_option_id
  FROM public.question_options qo
  WHERE qo.question_id = p_question_id AND qo.is_correct = true
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
    selected_option_id = EXCLUDED.selected_option_id,
    is_correct         = EXCLUDED.is_correct,
    marks_obtained     = EXCLUDED.marks_obtained,
    time_spent_seconds = EXCLUDED.time_spent_seconds,
    answered_at        = EXCLUDED.answered_at;

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
$function$;