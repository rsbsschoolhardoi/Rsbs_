-- Add binary fingerprint column for PDF consistency verification
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Update table metadata if needed
COMMENT ON COLUMN public.certificates.fingerprint IS 'SHA-256 binary hash of the generated PDF to ensure 100% layout consistency verification.';
