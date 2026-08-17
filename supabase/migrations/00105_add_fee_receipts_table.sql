
-- Fee receipts table
CREATE TABLE IF NOT EXISTS fee_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  fee_detail_ids text[] NOT NULL DEFAULT '{}',
  items jsonb NOT NULL DEFAULT '[]',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  transaction_id text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  generated_by uuid REFERENCES profiles(id),
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-increment receipt number per year
CREATE SEQUENCE IF NOT EXISTS fee_receipt_seq START 1000;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  seq_val bigint;
BEGIN
  seq_val := nextval('fee_receipt_seq');
  RETURN 'RCPT-' || yr || '-' || LPAD(seq_val::text, 5, '0');
END;
$$;

-- RLS
ALTER TABLE fee_receipts ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_full_access_receipts" ON fee_receipts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students: read their own receipts only
CREATE POLICY "student_read_own_receipts" ON fee_receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'student'
        AND student_id = fee_receipts.student_id
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE fee_receipts;
