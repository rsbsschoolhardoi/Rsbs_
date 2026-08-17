
CREATE OR REPLACE FUNCTION increment_receipt_regenerated(p_id uuid, p_pdf_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE fee_receipts
  SET
    regenerated_count    = regenerated_count + 1,
    pdf_url              = p_pdf_url,
    generation_timestamp = now(),
    updated_at           = now()
  WHERE id = p_id;
END;
$$;
