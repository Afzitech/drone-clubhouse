# Aeroforge v2 — Overhaul Plan (confirmed)

**Confirmed answers:**
- Landing page shows a **public photo gallery** (non-members can see project/showcase photos featured on the About page). Admins pick which images appear.
- Notifications: **in-app bell + email**.

Shipping in 3 phases. I'll start Phase 1 immediately after you approve.

---

## Phase 1 — Foundations

**Public landing (`/`)**
- Rebuild as a real overview: fixed top-right nav with Login button, hero, About, Mission, plus a **public photo strip** pulling featured images.
- Copy stored in `site_content` (single JSON row) so admins edit it live.
- Admin tab **"Landing page"** in Command Center to edit hero / about / mission / choose featured photos.
- Content read via a public server fn with anon SELECT policy.

**Theme refresh**
- Extend `src/styles.css` with subtle blueprint grid, telemetry accents, dashed flight-path divider, per-section accent tokens.
- Keep existing HUD utilities; no visual regressions.

**Dashboard cleanup** — remove email under the greeting.

**Profile settings (`/settings`)**
- Tabs: **Profile** (edit display name + avatar), **Security** (change password via `supabase.auth.updateUser`).
- `profiles.avatar_url` column + public `avatars` bucket.

**Project Lead role**
- Add `'lead'` to `app_role` enum. Admin gets Make lead / Remove lead action in members list.
- Amber "LEAD" badge on member list; project cards show lead's display name.

---

## Phase 2 — Community modules

- **Announcements** (`/announcements`) — text + image uploads (`announcements` public bucket); admins post, everyone reads; latest pinned on dashboard.
- **Event calendar** (`/calendar`) — month grid + upcoming list; admins create; members RSVP.
- **Submission updates** — members post progress notes/files (`submissions` private bucket, signed URLs); admins review each update.

---

## Phase 3 — Showcase, resources, notifications

- **Project showcase** (`/showcase`) — photo/video grid; members upload for approved projects; admins mark images as **featured** → those appear on the public landing page.
- **Technical resources** (`/resources`) — categorized links/PDFs (Guides, Research, Datasheets, Links).
- **Notifications** — `notifications` table + bell dropdown with unread badge, **plus email delivery via Lovable Emails** for: submission approved/rejected, reply on your thread, event reminder 24h before. Triggered from the same server fns that already handle those actions.

---

## Technical notes

- All new tables get `CREATE TABLE → GRANT → RLS → policies`.
- Storage: `avatars`, `announcements`, `showcase` public; `submissions` private (signed URLs).
- Email requires an email domain — I'll surface the setup dialog in Phase 3 if not configured yet.
- Nav grouped: **Ops** (Dashboard, Projects, Submit) · **Community** (Forum, Announcements, Calendar, Showcase) · **Library** (Resources) · **Admin**.

Approve and I'll start with Phase 1.
