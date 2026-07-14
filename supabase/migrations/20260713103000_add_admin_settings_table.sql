CREATE TABLE public.admin_settings (
  id text PRIMARY KEY,
  provider_fee_percent integer,
  stripe_account_id text,
  payment_enabled boolean,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin settings"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage admin settings"
  ON public.admin_settings FOR INSERT, UPDATE, DELETE
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
