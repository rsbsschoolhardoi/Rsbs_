
-- 1. Master Fees configuration table (class × session × amount)
CREATE TABLE master_fees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name    text NOT NULL,
  session_year  text NOT NULL,        -- e.g. "2025-2026"
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_name, session_year)
);

ALTER TABLE master_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_master_fees" ON master_fees
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "all_read_master_fees" ON master_fees
  FOR SELECT TO authenticated USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE master_fees;

-- 2. Extra / Other fees table — isolated ledger, never merged into core
CREATE TABLE extra_fees (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_category   text NOT NULL CHECK (fee_category IN ('extra', 'other')),
  description    text NOT NULL,           -- custom label e.g. "Library Fine"
  reason         text NOT NULL DEFAULT '',-- mandatory reason text
  amount         numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  payment_date   date NOT NULL DEFAULT CURRENT_DATE,
  session_year   text NOT NULL,
  transaction_id text,
  collected_by   uuid REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE extra_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_extra_fees" ON extra_fees
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "student_read_own_extra_fees" ON extra_fees
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student'
      AND student_id = extra_fees.student_id
  ));

CREATE POLICY "parent_read_linked_extra_fees" ON extra_fees
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN parent_student_links psl ON psl.parent_id = p.parent_profile_id
    WHERE p.id = auth.uid() AND p.role = 'parent'
      AND psl.student_id = extra_fees.student_id
  ));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE extra_fees;

-- 3. Fee payments ledger — tracks core fee payments per student per session
--    Used for max-limit validation: sum of amounts cannot exceed master_fees.total_amount
CREATE TABLE fee_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_year   text NOT NULL,
  payment_period text NOT NULL DEFAULT 'Full Year',  -- e.g. "Full Year", "April", "April-June"
  amount         numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  payment_date   date NOT NULL DEFAULT CURRENT_DATE,
  transaction_id text,
  notes          text,
  collected_by   uuid REFERENCES profiles(id),
  receipt_id     uuid REFERENCES fee_receipts(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_fee_payments" ON fee_payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "student_read_own_payments" ON fee_payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student'
      AND student_id = fee_payments.student_id
  ));

CREATE POLICY "parent_read_linked_payments" ON fee_payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN parent_student_links psl ON psl.parent_id = p.parent_profile_id
    WHERE p.id = auth.uid() AND p.role = 'parent'
      AND psl.student_id = fee_payments.student_id
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE fee_payments;

-- 4. RPC: get total core payments made by a student for a session
CREATE OR REPLACE FUNCTION get_student_core_paid_total(
  p_student_id uuid,
  p_session_year text
)
RETURNS numeric
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM fee_payments
  WHERE student_id = p_student_id
    AND session_year = p_session_year;
$$;
