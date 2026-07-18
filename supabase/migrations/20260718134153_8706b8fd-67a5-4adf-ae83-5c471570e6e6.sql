
-- Lock down trigger-only functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_admin_on_email_confirm() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role: only authenticated needs to call it (RLS policies run as caller role)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
