DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_period_type') THEN
    CREATE TYPE fee_period_type AS ENUM ('monthly', 'annual', 'combined', 'extra');
  END IF;
END$$;

ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS period_type text,
  ADD COLUMN IF NOT EXISTS period_value text,
  ADD COLUMN IF NOT EXISTS period_months text[];

ALTER TABLE fee_receipts
  ADD COLUMN IF NOT EXISTS period_type text,
  ADD COLUMN IF NOT EXISTS period_value text,
  ADD COLUMN IF NOT EXISTS period_months text[];

CREATE TABLE IF NOT EXISTS fee_payment_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_payment_id uuid NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_year text NOT NULL,
  period_type text NOT NULL,
  period_month text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS fee_payment_periods_unique_month
  ON fee_payment_periods (student_id, session_year, period_month);

CREATE INDEX IF NOT EXISTS fee_payment_periods_payment_idx
  ON fee_payment_periods (fee_payment_id);

CREATE TABLE IF NOT EXISTS fee_receipt_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES fee_receipts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  is_extended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS fee_receipt_visibility_unique_recipient
  ON fee_receipt_visibility (receipt_id, profile_id);

CREATE INDEX IF NOT EXISTS fee_receipt_visibility_expiry_idx
  ON fee_receipt_visibility (profile_id, expires_at);

ALTER TABLE fee_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payment_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_receipt_visibility ENABLE ROW LEVEL SECURITY;

-- Admin policies for new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fee_payment_periods' AND policyname = 'admin_full_access_fee_payment_periods'
  ) THEN
    CREATE POLICY admin_full_access_fee_payment_periods ON fee_payment_periods
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fee_receipt_visibility' AND policyname = 'admin_full_access_fee_receipt_visibility'
  ) THEN
    CREATE POLICY admin_full_access_fee_receipt_visibility ON fee_receipt_visibility
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fee_receipt_visibility' AND policyname = 'student_read_own_visibility'
  ) THEN
    CREATE POLICY student_read_own_visibility ON fee_receipt_visibility
      FOR SELECT TO authenticated
      USING (profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fee_receipt_visibility' AND policyname = 'parent_read_own_visibility'
  ) THEN
    CREATE POLICY parent_read_own_visibility ON fee_receipt_visibility
      FOR SELECT TO authenticated
      USING (profile_id = auth.uid());
  END IF;
END$$;

-- Function to generate period month keys from a period option
CREATE OR REPLACE FUNCTION payment_period_to_months(
  p_period text,
  p_session_year text
) RETURNS text[] AS $$
DECLARE
  v_months text[] := ARRAY['April','May','June','July','August','September','October','November','December','January','February','March'];
  v_start_year int;
  v_end_year int;
  v_parts text[];
  v_range text[];
  v_month text;
  v_year int;
  v_result text[] := '{}';
  v_idx int;
BEGIN
  IF p_session_year IS NULL OR p_session_year = '' THEN
    RETURN v_result;
  END IF;
  v_start_year := split_part(p_session_year, '-', 1)::int;
  v_end_year := CASE WHEN length(split_part(p_session_year, '-', 2)) = 2 THEN v_start_year + 1 ELSE split_part(p_session_year, '-', 2)::int END;

  IF lower(p_period) = 'full year' THEN
    RETURN ARRAY['annual:' || p_session_year];
  END IF;

  -- Combined range e.g. April-June or January-March
  IF position('-' in p_period) > 0 AND position(' ' in p_period) = 0 THEN
    v_range := string_to_array(p_period, '-');
    IF array_length(v_range, 1) = 2 THEN
      v_idx := array_position(v_months, v_range[1]);
      IF v_idx IS NOT NULL THEN
        FOR i IN 0..(array_position(v_months, v_range[2]) - v_idx) LOOP
          v_month := v_months[v_idx + i];
          v_year := CASE WHEN v_month IN ('January','February','March') THEN v_end_year ELSE v_start_year END;
          v_result := array_append(v_result, v_year || '-' || lpad((array_position(v_months, v_month))::text, 2, '0'));
        END LOOP;
      END IF;
    END IF;
    RETURN v_result;
  END IF;

  -- Single month with optional year suffix, e.g. 'April 2026' or 'April'
  v_parts := string_to_array(p_period, ' ');
  v_month := v_parts[1];
  IF v_parts[2] IS NOT NULL THEN
    v_year := v_parts[2]::int;
  ELSE
    v_year := CASE WHEN v_month IN ('January','February','March') THEN v_end_year ELSE v_start_year END;
  END IF;
  IF v_month IS NOT NULL THEN
    RETURN ARRAY[v_year || '-' || lpad((array_position(v_months, v_month))::text, 2, '0')];
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if all given period months are available for a student/session
CREATE OR REPLACE FUNCTION check_core_period_available(
  p_student_id uuid,
  p_session_year text,
  p_period_months text[]
) RETURNS boolean AS $$
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
      AND period_month = ANY(p_period_months)
  ) INTO v_exists;
  RETURN NOT v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register a core fee payment with period-level duplicate prevention
CREATE OR REPLACE FUNCTION register_fee_payment(
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
  p_collected_by uuid DEFAULT NULL
) RETURNS fee_payments AS $$
DECLARE
  v_payment fee_payments;
  v_month text;
BEGIN
  IF NOT check_core_period_available(p_student_id, p_session_year, p_period_months) THEN
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
    INSERT INTO fee_payment_periods (fee_payment_id, student_id, session_year, period_type, period_month)
    VALUES (v_payment.id, p_student_id, p_session_year, p_period_type, v_month)
    ON CONFLICT (student_id, session_year, period_month) DO NOTHING;
  END LOOP;

  RETURN v_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create receipt visibility for a receipt (student + linked parents)
CREATE OR REPLACE FUNCTION create_fee_receipt_visibility(
  p_receipt_id uuid,
  p_visibility_days int DEFAULT 30
) RETURNS void AS $$
DECLARE
  v_student_id uuid;
  v_student_profile uuid;
  v_parent_profile uuid;
  v_expires timestamptz;
BEGIN
  SELECT student_id INTO v_student_id FROM fee_receipts WHERE id = p_receipt_id;
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;

  v_expires := now() + (p_visibility_days || ' days')::interval;

  SELECT id INTO v_student_profile FROM profiles WHERE student_id = v_student_id AND role = 'student' LIMIT 1;
  IF v_student_profile IS NOT NULL THEN
    INSERT INTO fee_receipt_visibility (receipt_id, profile_id, role, student_id, expires_at)
    VALUES (p_receipt_id, v_student_profile, 'student', v_student_id, v_expires)
    ON CONFLICT (receipt_id, profile_id) DO UPDATE SET
      expires_at = EXCLUDED.expires_at,
      is_extended = false,
      updated_at = now();
  END IF;

  FOR v_parent_profile IN
    SELECT parent_id FROM parent_student_links WHERE student_id = v_student_id
  LOOP
    INSERT INTO fee_receipt_visibility (receipt_id, profile_id, role, student_id, expires_at)
    VALUES (p_receipt_id, v_parent_profile, 'parent', v_student_id, v_expires)
    ON CONFLICT (receipt_id, profile_id) DO UPDATE SET
      expires_at = EXCLUDED.expires_at,
      is_extended = false,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend visibility for a receipt
CREATE OR REPLACE FUNCTION extend_receipt_visibility(
  p_receipt_id uuid,
  p_visibility_days int DEFAULT 30
) RETURNS void AS $$
DECLARE
  v_expires timestamptz;
BEGIN
  v_expires := now() + (p_visibility_days || ' days')::interval;
  UPDATE fee_receipt_visibility
  SET expires_at = v_expires,
      is_extended = true,
      updated_at = now()
  WHERE receipt_id = p_receipt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get visible receipts for a student profile
CREATE OR REPLACE FUNCTION get_visible_receipts_for_student(
  p_student_id uuid,
  p_profile_id uuid DEFAULT auth.uid()
) RETURNS TABLE (
  id uuid,
  student_id uuid,
  receipt_number text,
  fee_detail_ids uuid[],
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
  regenerated_count int,
  is_receipt_generated boolean,
  generation_timestamp timestamptz,
  expires_at timestamptz,
  is_extended boolean,
  role text
) AS $$
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
    r.regenerated_count,
    r.is_receipt_generated,
    r.generation_timestamp,
    v.expires_at,
    v.is_extended,
    v.role
  FROM fee_receipts r
  JOIN fee_receipt_visibility v ON v.receipt_id = r.id
  WHERE r.student_id = p_student_id
    AND v.profile_id = p_profile_id
    AND v.expires_at > now()
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get visible receipts for a parent profile (all linked students)
CREATE OR REPLACE FUNCTION get_visible_receipts_for_parent(
  p_profile_id uuid DEFAULT auth.uid()
) RETURNS TABLE (
  id uuid,
  student_id uuid,
  receipt_number text,
  fee_detail_ids uuid[],
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
  regenerated_count int,
  is_receipt_generated boolean,
  generation_timestamp timestamptz,
  expires_at timestamptz,
  is_extended boolean,
  role text
) AS $$
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
    r.regenerated_count,
    r.is_receipt_generated,
    r.generation_timestamp,
    v.expires_at,
    v.is_extended,
    v.role
  FROM fee_receipts r
  JOIN fee_receipt_visibility v ON v.receipt_id = r.id
  WHERE v.profile_id = p_profile_id
    AND v.expires_at > now()
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing fee_payments: infer period_type and period_months
UPDATE fee_payments
SET
  period_type = CASE WHEN lower(payment_period) = 'full year' THEN 'annual' ELSE 'monthly' END,
  period_value = payment_period,
  period_months = payment_period_to_months(payment_period, session_year)
WHERE period_type IS NULL;

-- Backfill existing fee_payment_periods (best-effort, ignore conflicts)
INSERT INTO fee_payment_periods (fee_payment_id, student_id, session_year, period_type, period_month)
SELECT
  fp.id,
  fp.student_id,
  fp.session_year,
  COALESCE(fp.period_type, 'monthly'),
  unnest(fp.period_months)
FROM fee_payments fp
WHERE fp.period_months IS NOT NULL AND array_length(fp.period_months, 1) > 0
ON CONFLICT (student_id, session_year, period_month) DO NOTHING;
