
-- 1) Gallery featuring
ALTER TABLE public.gallery_items
  ADD COLUMN IF NOT EXISTS featured_on_landing boolean NOT NULL DEFAULT false;

-- 2) Forum read tracking
CREATE TABLE IF NOT EXISTS public.forum_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, thread_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_reads TO authenticated;
GRANT ALL ON public.forum_reads TO service_role;
ALTER TABLE public.forum_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own forum reads select" ON public.forum_reads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own forum reads insert" ON public.forum_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own forum reads update" ON public.forum_reads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own forum reads delete" ON public.forum_reads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3) Direct messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dm_pair_idx ON public.direct_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_recipient_idx ON public.direct_messages (recipient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants can read dms" ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "sender can send dm" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "recipient can mark read" ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
CREATE POLICY "sender can delete dm" ON public.direct_messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- 4) Bookings enums + table
DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.resource_kind AS ENUM ('club_room','printer_3d');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.resource_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.resource_kind NOT NULL,
  purpose text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);
CREATE INDEX IF NOT EXISTS rb_kind_time_idx ON public.resource_bookings (kind, start_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_bookings TO authenticated;
GRANT ALL ON public.resource_bookings TO service_role;
ALTER TABLE public.resource_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visible bookings" ON public.resource_bookings FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR status IN ('pending','approved')
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "member can request booking" ON public.resource_bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "owner can cancel" ON public.resource_bookings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending','approved'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','cancelled'));
CREATE POLICY "admin can review booking" ON public.resource_bookings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin can delete booking" ON public.resource_bookings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER rb_updated_at BEFORE UPDATE ON public.resource_bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Overlap guard for approved bookings
CREATE OR REPLACE FUNCTION public.tg_booking_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    IF EXISTS (
      SELECT 1 FROM public.resource_bookings b
      WHERE b.id <> NEW.id
        AND b.kind = NEW.kind
        AND b.status = 'approved'
        AND b.start_at < NEW.end_at
        AND b.end_at > NEW.start_at
    ) THEN
      RAISE EXCEPTION 'Booking overlaps an existing approved booking for this resource';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER rb_no_overlap BEFORE INSERT OR UPDATE ON public.resource_bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_booking_no_overlap();

-- 5) Project updates cascade so admin can delete projects
ALTER TABLE public.project_updates
  DROP CONSTRAINT IF EXISTS project_updates_project_id_fkey;
ALTER TABLE public.project_updates
  ADD CONSTRAINT project_updates_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Allow admin to delete projects explicitly
DROP POLICY IF EXISTS "admin can delete projects" ON public.projects;
CREATE POLICY "admin can delete projects" ON public.projects FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
