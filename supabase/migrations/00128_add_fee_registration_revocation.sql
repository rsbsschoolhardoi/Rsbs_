-- Add revocation columns to fee_payments
ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid,
  ADD COLUMN IF NOT EXISTS revocation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_revoked boolean NOT NULL DEFAULT false;

-- Add revocation columns to fee_receipts
ALTER TABLE fee_receipts
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid,
  ADD COLUMN IF NOT EXISTS revocation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_revoked boolean NOT NULL DEFAULT false;

-- Add revocation columns to fee_payment_periods
ALTER TABLE fee_payment_periods
  ADD COLUMN IF NOT EXISTS is_revoked boolean NOT NULL DEFAULT false;

-- Replace unique constraint to allow both active and revoked rows for audit
ALTER TABLE fee_payment_periods
  DROP CONSTRAINT IF EXISTS fee_payment_periods_unique;

ALTER TABLE fee_payment_periods
  ADD CONSTRAINT fee_payment_periods_unique UNIQUE (student_id, session_year, fee_type, period_month, is_revoked);

-- Update existing active rows to is_revoked = false
UPDATE fee_payment_periods SET is_revoked = false WHERE is_revoked IS NULL;

-- Update register_fee_payment to set revocation window and handle reactivation
CREATE OR REPLACE FUNCTION public.register_fee_payment(
  p_student_id uuid,
  p_session_year text,
  p_period text,
  p_period_type text,
  p_period_months text[],
  p_amount numeric,
  p_payment_method text,
  p_payment_date date,
  p_transaction_id text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_collected_by uuid DEFAULT NULL,
  p_fee_type text DEFAULT 'core'
)
RETURNS fee_payments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    amount, payment_method, payment_date, transaction_id, notes, collected_by,
    revocation_expires_at
  ) VALUES (
    p_student_id, p_session_year, p_period, p_period_type, p_period, p_period_months,
    p_amount, p_payment_method, p_payment_date, p_transaction_id, p_notes, p_collected_by,
    now() + interval '2 minutes'
  ) RETURNING * INTO v_payment;

  FOREACH v_month IN ARRAY p_period_months LOOP
    INSERT INTO fee_payment_periods (fee_payment_id, student_id, session_year, fee_type, period_type, period_month)
    VALUES (v_payment.id, p_student_id, p_session_year, p_fee_type, p_period_type, v_month)
    ON CONFLICT (student_id, session_year, fee_type, period_month, is_revoked) DO UPDATE
      SET fee_payment_id = v_payment.id,
          period_type = p_period_type,
          is_revoked = false;
  END LOOP;

  RETURN v_payment;
END;
$$;

-- Update check_core_period_available to ignore revoked periods
CREATE OR REPLACE FUNCTION public.check_core_period_available(
  p_student_id uuid,
  p_session_year text,
  p_period_months text[],
  p_fee_type text DEFAULT 'core'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      AND is_revoked = false
  ) INTO v_exists;
  RETURN NOT v_exists;
END;
$$;

-- Update get_student_core_paid_total to exclude revoked payments
CREATE OR REPLACE FUNCTION public.get_student_core_paid_total(
  p_student_id uuid,
  p_session_year text
)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM fee_payments
  WHERE student_id = p_student_id
    AND session_year = p_session_year
    AND is_revoked = false;
$$;

-- Update visible-receipts functions to exclude revoked receipts
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
  created_at timestamptz,
  updated_at timestamptz,
  is_receipt_generated boolean,
  generation_timestamp timestamptz,
  period_type text,
  period_value text,
  period_months text[],
  expires_at timestamptz,
  is_extended boolean,
  role text,
  students jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    AND r.is_revoked = false
  ORDER BY r.created_at DESC;
END;
$$;

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
  created_at timestamptz,
  updated_at timestamptz,
  is_receipt_generated boolean,
  generation_timestamp timestamptz,
  period_type text,
  period_value text,
  period_months text[],
  expires_at timestamptz,
  is_extended boolean,
  role text,
  students jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    AND r.is_revoked = false
  ORDER BY r.created_at DESC;
END;
$$;

-- Revocation function
CREATE OR REPLACE FUNCTION public.revoke_fee_registration(
  p_payment_id uuid,
  p_revoked_by uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment fee_payments;
  v_receipt_id uuid;
BEGIN
  SELECT * INTO v_payment
  FROM fee_payments
  WHERE id = p_payment_id
    AND is_revoked = false
    AND revocation_expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found, already revoked, or the revocation window has closed.';
  END IF;

  UPDATE fee_payments
  SET is_revoked = true,
      revoked_at = now(),
      revoked_by = p_revoked_by
  WHERE id = p_payment_id;

  -- Mark derived period rows as revoked so the period becomes available again
  UPDATE fee_payment_periods
  SET is_revoked = true
  WHERE fee_payment_id = p_payment_id;

  -- If a receipt was generated, mark it revoked
  SELECT id INTO v_receipt_id FROM fee_receipts WHERE id = v_payment.receipt_id;
  IF v_receipt_id IS NOT NULL THEN
    UPDATE fee_receipts
    SET is_revoked = true,
        revoked_at = now(),
        revoked_by = p_revoked_by,
        pdf_url = NULL
    WHERE id = v_receipt_id;
  END IF;

  RETURN true;
END;
$$;
