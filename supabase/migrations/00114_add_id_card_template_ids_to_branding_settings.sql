
ALTER TABLE public.branding_settings
  ADD COLUMN IF NOT EXISTS id_card_front_template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_card_back_template_id  uuid REFERENCES public.document_templates(id) ON DELETE SET NULL;
