## Aeroforge v3 — Community + Ops upgrade

Big batch of changes; grouping so nothing gets missed.

### 1. Navigation
- Remove the desktop tab bar and mobile scroll row from the top header.
- Replace them with a single hamburger button (top-left) that opens a slide-out drawer containing every section: Dashboard, Projects, News, Events, Forum, Gallery, Library, Members, Rooms, 3D Printer, Submit, Settings.
- Bell + Command + avatar + sign-out stay in the header.

### 2. Forum activity indicators
- Track per-user "last seen" timestamp per thread (new `forum_reads` table: `user_id`, `thread_id`, `last_read_at`).
- Compute unread thread count for the signed-in user (threads with posts newer than their last_read_at, or never read).
- Show a red dot + count badge on the "Forum" item in the drawer.
- Surface an "Unread forum activity" card on the Dashboard so the count is visible from the homepage.
- Mark a thread as read when the user opens it.

### 3. Project workflow fixes
- Update-review notifications: `notifyUsers` currently silently swallows errors. Debug and ensure the notification row lands for the update author (project_updates approve/reject path in `projects.tsx`).
- Post-update permissions: only the project's `lead_user_id` and admins can post updates on a project. Members without that role see the update history but no form.
- Lead-request approval: when a lead submits a project update (status pending), notify all admins with a link to that project. Show a Command-Center pill badge with the pending-update count next to Submissions.
- Admin delete project: red "Delete project" button on each card in `/projects` (admin only). Cascades to `project_updates`.

### 4. Members directory + DMs
- New route `/members` (all authenticated users): grid of every member with avatar, display name, role chips, "Message" button.
- New table `direct_messages` (`sender_id`, `recipient_id`, `body`, `created_at`, `read_at`) with RLS: participants only.
- New route `/messages` with left column = conversation list (grouped by other participant), right column = thread view + composer.
- "Message" on a member card deep-links to `/messages?to=<userId>`.
- Unread DM count badge in header bell area (separate small envelope icon) and on the drawer's "Messages" item.
- Realtime channel subscribed to `direct_messages` inserts scoped to `recipient_id=<me>`.

### 5. Gallery featuring
- Add `featured_on_landing` boolean to `gallery_items` (default false).
- Admins get a "Feature on landing" toggle on each gallery card.
- `public-gallery.functions.ts` only returns items where `featured_on_landing = true`.
- Migrate existing rows to `false` so admin explicitly opts in.

### 6. Admin Command Center indicators
- Header "Command" button gains a red dot when there are pending submissions OR pending project updates.
- Command Center adds a new "Update reviews" tab listing every pending `project_updates` with approve/reject/note (mirrors project inline review, centralised).
- Rename "Make lead" → "Make pilot" everywhere (label only; role identifier stays `lead` in the DB to avoid a destructive enum rename).

### 7. Room + 3D printer bookings
- New enum `booking_status`: `pending`, `approved`, `rejected`, `cancelled`.
- New enum `resource_kind`: `club_room`, `printer_3d`.
- New table `resource_bookings` (`user_id`, `kind`, `purpose`, `start_at`, `end_at`, `status`, `admin_note`, `reviewed_by`, `reviewed_at`).
- Overlap check enforced in a `BEFORE INSERT/UPDATE` trigger for approved bookings (reject if it overlaps another approved booking of same kind).
- Routes:
  - `/bookings/room` — members request slots, see their own history + upcoming approved bookings from everyone.
  - `/bookings/printer` — same shape for the 3D printer.
- Admin section inside Command Center: "Bookings" tab with pending queue (approve/reject) and full history table (filter by kind + status).
- Notification to requester on approve/reject.

### 8. Small polish
- Notifications page + bell already exist; extend the `notifications.type` values informally (`forum-activity`, `dm`, `update-review`, `booking-review`, `submission-received`, `update-review-request`).
- Header layout: hamburger, brand, spacer, bell, envelope (DM), Command (if admin), avatar, Sign out.

### Technical notes
- One SQL migration covering: `forum_reads`, `direct_messages`, `resource_bookings`, `booking_status`/`resource_kind` enums, overlap trigger, `gallery_items.featured_on_landing`. Full GRANTs + RLS as per project rules.
- Realtime enabled on `direct_messages` and `notifications` (already on).
- New server functions where admin/service actions are needed: `adminReviewBooking`, `adminReviewUpdate` (may reuse existing inline path); user-side actions go through RLS via the browser client.
- `projects.tsx` inline update form gated by `project.lead_user_id === user.id || isAdmin`.

### Out of scope (call out)
- Email notifications remain off (per your instruction).
- Recurring or multi-slot bookings — single time-range per request.
- Group DMs — 1:1 only for now.

If this looks right I'll ship it in one pass: migration first, then routes/components.
