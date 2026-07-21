
-- Add 'lead' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lead';

-- Profiles: avatar_url
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Site content table (single-row keyed model for landing page copy)
CREATE TABLE IF NOT EXISTS public.site_content (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_content readable by everyone"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "site_content editable by admins"
  ON public.site_content FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_content_touch
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Seed the landing content row
INSERT INTO public.site_content (id, data) VALUES (
  'landing',
  jsonb_build_object(
    'hero_eyebrow', 'Restricted airspace · Members only',
    'hero_title', 'Aeroforge',
    'hero_accent', 'forge the sky.',
    'hero_subtitle', 'A private hangar for our drone club — coordinate builds, track live project status, and log flight ops in one place.',
    'about_title', 'About Aeroforge',
    'about_body', 'Aeroforge is the operations hub for our drone & robotics club. Members collaborate on aerial builds, share flight telemetry, and push the envelope of what small unmanned systems can do.',
    'mission_title', 'Our Mission',
    'mission_body', 'To design, build, and fly next-generation UAVs — training pilots, engineers, and dreamers to master the sky responsibly.'
  )
) ON CONFLICT (id) DO NOTHING;
