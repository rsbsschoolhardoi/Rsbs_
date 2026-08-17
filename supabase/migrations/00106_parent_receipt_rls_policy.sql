
-- Allow parents to read fee receipts for their linked students
CREATE POLICY "parent_read_linked_student_receipts" ON fee_receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles pr
      JOIN parent_student_links psl ON psl.parent_id = (
        SELECT parent_profile_id FROM profiles WHERE id = auth.uid()
      )
      WHERE pr.id = auth.uid()
        AND pr.role = 'parent'
        AND psl.student_id = fee_receipts.student_id
    )
  );
