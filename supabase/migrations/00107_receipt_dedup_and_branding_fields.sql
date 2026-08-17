
-- 1. Add deduplication + idempotency fields to fee_receipts
ALTER TABLE fee_receipts
  ADD COLUMN IF NOT EXISTS receipt_hash       text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_receipt_generated boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS generation_timestamp timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS regenerated_count  int NOT NULL DEFAULT 0;

-- Index for hash lookups
CREATE UNIQUE INDEX IF NOT EXISTS fee_receipts_hash_idx ON fee_receipts (receipt_hash) WHERE receipt_hash IS NOT NULL;

-- 2. Extend branding_settings with contact/affiliation fields
ALTER TABLE branding_settings
  ADD COLUMN IF NOT EXISTS school_address     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_phone       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_email       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS affiliation_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS affiliation_board  text NOT NULL DEFAULT '';

-- 3. Storage bucket for fee receipt PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fee-receipts',
  'fee-receipts',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admin can upload/read; students/parents read their own
CREATE POLICY "admin_manage_receipts_storage" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'fee-receipts'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'fee-receipts'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "student_read_own_receipt_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fee-receipts'
    AND EXISTS (
      SELECT 1 FROM profiles p
      JOIN fee_receipts fr ON fr.student_id = p.student_id
      WHERE p.id = auth.uid()
        AND p.role = 'student'
        AND fr.pdf_url LIKE '%' || name || '%'
    )
  );

CREATE POLICY "parent_read_linked_receipt_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fee-receipts'
    AND EXISTS (
      SELECT 1 FROM profiles p
      JOIN parent_student_links psl ON psl.parent_id = p.parent_profile_id
      JOIN fee_receipts fr ON fr.student_id = psl.student_id
      WHERE p.id = auth.uid()
        AND p.role = 'parent'
        AND fr.pdf_url LIKE '%' || name || '%'
    )
  );
