
-- helper: shared updated_at trigger already exists as public.tg_touch_updated_at

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins/leads insert announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "admins/leads update announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "admins delete announcements" ON public.announcements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_announcements BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- EVENTS
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins/leads insert events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "admins/leads update events" ON public.events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "admins delete events" ON public.events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_events BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- PROJECT UPDATES (workflow with file attachments)
CREATE TYPE public.update_status AS ENUM ('pending','approved','rejected');
CREATE TABLE public.project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  status public.update_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_updates TO authenticated;
GRANT ALL ON public.project_updates TO service_role;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read approved or own updates" ON public.project_updates FOR SELECT TO authenticated
  USING (status = 'approved' OR author_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "members insert own updates" ON public.project_updates FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "admins/leads review updates" ON public.project_updates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "author or admin delete updates" ON public.project_updates FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_project_updates BEFORE UPDATE ON public.project_updates FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- GALLERY (public showcase)
CREATE TABLE public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  caption TEXT,
  image_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read gallery" ON public.gallery_items FOR SELECT TO anon USING (true);
CREATE POLICY "auth read gallery" ON public.gallery_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins/leads insert gallery" ON public.gallery_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "admins/leads update gallery" ON public.gallery_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "admins delete gallery" ON public.gallery_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_gallery_items BEFORE UPDATE ON public.gallery_items FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- RESOURCE LIBRARY
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read resources" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins/leads insert resources" ON public.resources FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "admins/leads update resources" ON public.resources FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead'));
CREATE POLICY "admins delete resources" ON public.resources FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_resources BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- NOTIFICATIONS (in-app)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
-- inserts happen via service_role from server functions only
CREATE INDEX notifications_user_unread_idx ON public.notifications(user_id, read_at, created_at DESC);
