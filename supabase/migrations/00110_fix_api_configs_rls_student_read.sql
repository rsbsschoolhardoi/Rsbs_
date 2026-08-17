-- Allow all authenticated users to READ api_configs
-- Students need this to resolve their Study AI model config.
-- Only active configs are exposed; the api_key is needed client-side to attach auth headers.
-- Write operations remain admin-only via the existing "Admins can manage api_configs" ALL policy.

CREATE POLICY "Authenticated users can read api_configs"
  ON public.api_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure chatbots SELECT is available to all authenticated users
-- (the users_view_chatbots policy already exists but uses school_id scoping;
--  add a clean authenticated fallback for rows where school_id is NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chatbots'
      AND policyname = 'Authenticated users can read chatbots'
  ) THEN
    CREATE POLICY "Authenticated users can read chatbots"
      ON public.chatbots
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;