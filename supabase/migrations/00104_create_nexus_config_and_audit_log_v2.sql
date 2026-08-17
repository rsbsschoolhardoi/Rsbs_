
-- nexus_config: stores the Nexus OIDC/SSO integration configuration (single-row table)
CREATE TABLE IF NOT EXISTS public.nexus_config (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled                   boolean NOT NULL DEFAULT false,
  identity_provider_url     text,
  authorization_endpoint    text,
  token_endpoint            text,
  user_info_endpoint        text,
  logout_endpoint           text,
  client_id                 text,
  client_secret             text,
  redirect_uri              text,
  post_logout_redirect_uri  text,
  show_continue_button      boolean NOT NULL DEFAULT false,
  allow_local_login         boolean NOT NULL DEFAULT true,
  force_nexus_login         boolean NOT NULL DEFAULT false,
  auto_redirect_to_nexus    boolean NOT NULL DEFAULT false,
  allow_sso                 boolean NOT NULL DEFAULT true,
  requested_scopes          jsonb    NOT NULL DEFAULT '["openid","profile","email"]'::jsonb,
  pkce_enabled              boolean NOT NULL DEFAULT true,
  state_validation_enabled  boolean NOT NULL DEFAULT true,
  last_test_timestamp       timestamptz,
  last_test_result          text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  created_by                uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by                uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_nexus_config_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nexus_config_updated_at ON public.nexus_config;
CREATE TRIGGER trg_nexus_config_updated_at
  BEFORE UPDATE ON public.nexus_config
  FOR EACH ROW EXECUTE FUNCTION public.set_nexus_config_updated_at();

-- Insert the single default config row if none exists
INSERT INTO public.nexus_config (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.nexus_config);

-- nexus_audit_log: records every configuration change / test action
CREATE TABLE IF NOT EXISTS public.nexus_audit_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp        timestamptz NOT NULL DEFAULT now(),
  admin_user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_username   text NOT NULL DEFAULT '',
  action_type      text NOT NULL,
  changes_summary  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.nexus_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_audit_log  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_nexus_config"     ON public.nexus_config;
DROP POLICY IF EXISTS "admins_write_nexus_config"    ON public.nexus_config;
DROP POLICY IF EXISTS "admins_read_nexus_audit_log"  ON public.nexus_audit_log;
DROP POLICY IF EXISTS "admins_insert_nexus_audit_log" ON public.nexus_audit_log;

CREATE POLICY "admins_read_nexus_config" ON public.nexus_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_write_nexus_config" ON public.nexus_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_read_nexus_audit_log" ON public.nexus_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_insert_nexus_audit_log" ON public.nexus_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
