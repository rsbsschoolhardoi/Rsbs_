-- Add revocation columns to extra_fees
ALTER TABLE extra_fees
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid,
  ADD COLUMN IF NOT EXISTS revocation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_revoked boolean NOT NULL DEFAULT false;

-- Update getExtraFees to exclude revoked by default
CREATE OR REPLACE FUNCTION public.get_extra_fees(
  p_student_id uuid,
  p_session_year text
)
RETURNS TABLE(
  id uuid,
  student_id uuid,
  fee_category text,
  description text,
  reason text,
  amount numeric,
  payment_method text,
  payment_date date,
  session_year text,
  transaction_id text,
  collected_by uuid,
  created_at timestamptz,
  is_revoked boolean,
  revoked_at timestamptz,
  revoked_by uuid,
  revocation_expires_at timestamptz,
  students jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.student_id,
    e.fee_category,
    e.description,
    e.reason,
    e.amount,
    e.payment_method,
    e.payment_date,
    e.session_year,
    e.transaction_id,
    e.collected_by,
    e.created_at,
    e.is_revoked,
    e.revoked_at,
    e.revoked_by,
    e.revocation_expires_at,
    to_jsonb(s.*) AS students
  FROM extra_fees e
  JOIN students s ON s.id = e.student_id
  WHERE e.student_id = p_student_id
    AND e.session_year = p_session_year
    AND e.is_revoked = false
  ORDER BY e.created_at DESC;
END;
$$;

-- Revocation function for extra fees
CREATE OR REPLACE FUNCTION public.revoke_extra_fee(
  p_extra_fee_id uuid,
  p_revoked_by uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE extra_fees
  SET is_revoked = true,
      revoked_at = now(),
      revoked_by = p_revoked_by
  WHERE id = p_extra_fee_id
    AND is_revoked = false
    AND revocation_expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Extra fee not found, already revoked, or the revocation window has closed.';
  END IF;

  RETURN true;
END;
$$;
