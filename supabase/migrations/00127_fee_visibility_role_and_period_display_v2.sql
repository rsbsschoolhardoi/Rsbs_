-- Drop existing functions whose signatures will change
DROP FUNCTION IF EXISTS public.get_visible_receipts_for_student(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_visible_receipts_for_parent(uuid);
DROP FUNCTION IF EXISTS public.register_fee_payment(uuid, text, text, text, text[], numeric, text, date, text, text, uuid);
DROP FUNCTION IF EXISTS public.extend_receipt_visibility(uuid, integer);
DROP FUNCTION IF EXISTS public.extend_receipt_visibility_for_role(uuid, text, integer);
DROP FUNCTION IF EXISTS public.get_receipt_visibility_status(uuid);
DROP FUNCTION IF EXISTS public.check_core_period_available(uuid, text, text[]);

-- Add fee_type to fee_payment_periods to support fee-type-aware duplicate prevention
ALTER TABLE fee_payment_periods ADD COLUMN IF NOT EXISTS fee_type text NOT NULL DEFAULT 'core';

-- Update unique constraint to include fee_type
ALTER TABLE fee_payment_periods DROP CONSTRAINT IF EXISTS fee_payment_periods_unique;
ALTER TABLE fee_payment_periods ADD CONSTRAINT fee_payment_periods_unique UNIQUE (student_id, session_year, fee_type, period_month);

-- Update check_core_period_available to include fee_type
CREATE OR REPLACE FUNCTION public.check_core_period_available(
  p_student_id uuid,
  p_session_year text,
  p_period_months text[],
  p_fee_type text DEFAULT 'core'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_exists boolean;
BEGIN
  IF p_period_months IS NULL OR array_length(p_period_months, 1) IS NULL THEN
    RETURN true;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM fee_payment_periods
    WHERE student_id = p_student_id
      AND session_year = p_session_year
      AND fee_type = p_fee_type
      AND period_month = ANY(p_period_months)
  ) INTO v_exists;
  RETURN NOT v_exists;
END;
$function$;

-- Update register_fee_payment to accept fee_type and enforce duplicate prevention
CREATE OR REPLACE FUNCTION public.register_fee_payment(
  p_student_id uuid,
  p_session_year text,
  p_period text,
  p_period_type text,
  p_period_months text[],
  p_amount numeric,
  p_payment_method text,
  p_payment_date date,
  p_transaction_id text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_collected_by uuid DEFAULT NULL::uuid,
  p_fee_type text DEFAULT 'core'
)
RETURNS fee_payments
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_payment fee_payments;
  v_month text;
  v_available boolean;
BEGIN
  v_available := check_core_period_available(p_student_id, p_session_year, p_period_months, p_fee_type);
  IF NOT v_available THEN
    RAISE EXCEPTION 'One or more selected periods are already registered as paid for this student/session.';
  END IF;

  INSERT INTO fee_payments (
    student_id, session_year, payment_period, period_type, period_value, period_months,
    amount, payment_method, payment_date, transaction_id, notes, collected_by
  ) VALUES (
    p_student_id, p_session_year, p_period, p_period_type, p_period, p_period_months,
    p_amount, p_payment_method, p_payment_date, p_transaction_id, p_notes, p_collected_by
  ) RETURNING * INTO v_payment;

  FOREACH v_month IN ARRAY p_period_months LOOP
    INSERT INTO fee_payment_periods (fee_payment_id, student_id, session_year, fee_type, period_type, period_month)
    VALUES (v_payment.id, p_student_id, p_session_year, p_fee_type, p_period_type, v_month)
    ON CONFLICT (student_id, session_year, fee_type, period_month) DO NOTHING;
  END LOOP;

  RETURN v_payment;
END;
$function$;

-- Add role-specific receipt extension
CREATE OR REPLACE FUNCTION public.extend_receipt_visibility_for_role(
  p_receipt_id uuid,
  p_role text,
  p_visibility_days integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_expires timestamptz;
BEGIN
  v_expires := now() + (p_visibility_days || ' days')::interval;
  UPDATE fee_receipt_visibility
  SET expires_at = v_expires,
      is_extended = true,
      updated_at = now()
  WHERE receipt_id = p_receipt_id
    AND role = p_role;
END;
$function$;

-- Keep global extend for backward compatibility as a convenience wrapper
CREATE OR REPLACE FUNCTION public.extend_receipt_visibility(
  p_receipt_id uuid,
  p_visibility_days integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM extend_receipt_visibility_for_role(p_receipt_id, 'student', p_visibility_days);
  PERFORM extend_receipt_visibility_for_role(p_receipt_id, 'parent', p_visibility_days);
END;
$function$;

-- Get visibility status for a receipt (admin/ledger view)
CREATE OR REPLACE FUNCTION public.get_receipt_visibility_status(p_receipt_id uuid)
RETURNS TABLE(role text, expires_at timestamp with time zone, is_extended boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT v.role, v.expires_at, v.is_extended
  FROM fee_receipt_visibility v
  WHERE v.receipt_id = p_receipt_id
  ORDER BY v.role;
END;
$function$;

-- Update visible receipt views to include period fields and student data
CREATE OR REPLACE FUNCTION public.get_visible_receipts_for_student(
  p_student_id uuid,
  p_profile_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  id uuid,
  student_id uuid,
  receipt_number text,
  fee_detail_ids text[],
  items jsonb,
  total_amount numeric,
  payment_method text,
  transaction_id text,
  payment_date date,
  notes text,
  generated_by uuid,
  pdf_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  is_receipt_generated boolean,
  generation_timestamp timestamp with time zone,
  period_type text,
  period_value text,
  period_months text[],
  expires_at timestamp with time zone,
  is_extended boolean,
  role text,
  students jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.student_id,
    r.receipt_number,
    r.fee_detail_ids,
    r.items,
    r.total_amount,
    r.payment_method,
    r.transaction_id,
    r.payment_date,
    r.notes,
    r.generated_by,
    r.pdf_url,
    r.created_at,
    r.updated_at,
    r.is_receipt_generated,
    r.generation_timestamp,
    r.period_type,
    r.period_value,
    r.period_months,
    v.expires_at,
    v.is_extended,
    v.role,
    to_jsonb(s.*) AS students
  FROM fee_receipts r
  JOIN fee_receipt_visibility v ON v.receipt_id = r.id
  JOIN students s ON s.id = r.student_id
  WHERE r.student_id = p_student_id
    AND v.profile_id = p_profile_id
    AND v.role = 'student'
    AND v.expires_at > now()
  ORDER BY r.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_visible_receipts_for_parent(
  p_profile_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  id uuid,
  student_id uuid,
  receipt_number text,
  fee_detail_ids text[],
  items jsonb,
  total_amount numeric,
  payment_method text,
  transaction_id text,
  payment_date date,
  notes text,
  generated_by uuid,
  pdf_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  is_receipt_generated boolean,
  generation_timestamp timestamp with time zone,
  period_type text,
  period_value text,
  period_months text[],
  expires_at timestamp with time zone,
  is_extended boolean,
  role text,
  students jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.student_id,
    r.receipt_number,
    r.fee_detail_ids,
    r.items,
    r.total_amount,
    r.payment_method,
    r.transaction_id,
    r.payment_date,
    r.notes,
    r.generated_by,
    r.pdf_url,
    r.created_at,
    r.updated_at,
    r.is_receipt_generated,
    r.generation_timestamp,
    r.period_type,
    r.period_value,
    r.period_months,
    v.expires_at,
    v.is_extended,
    v.role,
    to_jsonb(s.*) AS students
  FROM fee_receipts r
  JOIN fee_receipt_visibility v ON v.receipt_id = r.id
  JOIN students s ON s.id = r.student_id
  WHERE v.profile_id = p_profile_id
    AND v.role = 'parent'
    AND v.expires_at > now()
  ORDER BY r.created_at DESC;
END;
$function$;
