
-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Expand branding_settings + fix document_templates.name UNIQUE
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Expand branding_settings with all new fields
ALTER TABLE public.branding_settings
  ADD COLUMN IF NOT EXISTS school_short_name         text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_website            text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_city               text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_state              text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_pin_code           text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_academic_session  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_motto              text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS theme_color               text NOT NULL DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS secondary_color           text NOT NULL DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS school_footer_text        text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_registration_number text NOT NULL DEFAULT '';

-- 2. Drop the UNIQUE constraint on document_templates.name so duplicate names
--    no longer raise a DB-level error. Uniqueness will be enforced in app logic.
ALTER TABLE public.document_templates
  DROP CONSTRAINT IF EXISTS document_templates_name_key;

-- 3. Add a non-unique index to keep name lookups fast
CREATE INDEX IF NOT EXISTS idx_document_templates_name
  ON public.document_templates (name);
