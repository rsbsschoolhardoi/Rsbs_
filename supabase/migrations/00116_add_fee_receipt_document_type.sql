ALTER TABLE document_templates DROP CONSTRAINT document_templates_type_check;
ALTER TABLE document_templates ADD CONSTRAINT document_templates_type_check CHECK (type = ANY (ARRAY['Certificate'::text, 'ID Card'::text, 'Admission Certificate'::text, 'Result'::text, 'Fee Receipt'::text]));

ALTER TABLE branding_settings ADD COLUMN fee_receipt_template_id uuid;
ALTER TABLE branding_settings ADD CONSTRAINT fk_fee_receipt_template_id FOREIGN KEY (fee_receipt_template_id) REFERENCES document_templates(id) ON DELETE SET NULL;

UPDATE document_templates SET type = 'Fee Receipt' WHERE name = 'Premium Fee Receipt';