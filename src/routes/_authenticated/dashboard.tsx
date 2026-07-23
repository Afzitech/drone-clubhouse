import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type PendingBooking = {
  id: string;
  user_id: string;
  kind: "club_room" | "printer_3d";
  purpose: string;
  start_at: string;
  end_at: string;
  created_at: string;
};

function Dashboard() {
  const { user } = Route.useRouteContext();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeProjects, setActiveProjects] = useState<number>(0);
  const [mySubs, setMySubs] = useState<number>(0);
  const [forumUnread, setForumUnread] = useState<number>(0);
  const [dmUnread, setDmUnread] = useState<number>(0);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string | null>>({});

  async function loadAdminData() {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const adminCheck = (roles ?? []).some((r) => r.role === "admin");
    setIsAdmin(adminCheck);

    if (adminCheck) {
      const { data: bData } = await supabase
        .from("resource_bookings")
        .select("id,user_id,kind,purpose,start_at,end_at,created_at")
        .eq("status", "pending")
        .order("start_at", { ascending: true });
      
      const list = (bData ?? []) as PendingBooking[];
      setPendingBookings(list);

      const ids = Array.from(new Set(list.map((b) => b.user_id)));
      if (ids.length) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("id,display_name")
          .in("id", ids);
        const map: Record<string, string | null> = {};
        (pData ?? []).forEach((row) => (map[row.id] = row.display_name));
        setProfiles(map);
      }
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (alive) setDisplayName(data?.display_name ?? null);
    })();
    loadAdminData();
    return () => {
      alive = false;
    };
  }, [user.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ count: p }, { count: s }, { count: d }] = await Promise.all([
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .in("status", ["planning", "in_progress", "testing"]),
        supabase
          .from("project_submissions")
          .select("id", { count: "exact", head: true })
          .eq("submitter_id", user.id),
        supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null),
      ]);

      const { data: threads } = await supabase
        .from("forum_threads")
        .select("id,created_at");
      const threadIds = (threads ?? []).map((t) => t.id);
      const { data: reads } = await supabase
        .from("forum_reads")
        .select("thread_id,last_read_at")
        .eq("user_id", user.id);
      const readMap = new Map<string, string>(
        (reads ?? []).map((r) => [r.thread_id, r.last_read_at]),
      );
      const { data: lastPosts } =
        threadIds.length > 0
          ? await supabase
              .from("forum_posts")
              .select("thread_id,created_at")
              .in("thread_id", threadIds)
          : { data: [] as { thread_id: string; created_at: string }[] };
      const lastActivity = new Map<string, string>();
      for (const t of threads ?? []) lastActivity.set(t.id, t.created_at);
      for (const p of lastPosts ?? []) {
        const prev = lastActivity.get(p.thread_id);
        if (!prev || new Date(p.created_at) > new Date(prev))
          lastActivity.set(p.thread_id, p.created_at);
      }
      let unread = 0;
      for (const [tid, ts] of lastActivity) {
        const seen = readMap.get(tid);
        if (!seen || new Date(ts) > new Date(seen)) unread++;
      }

      if (!alive) return;
      setActiveProjects(p ?? 0);
      setMySubs(s ?? 0);
      setForumUnread(unread);
      setDmUnread(d ?? 0);
    })();
    return () => {
      alive = false;
    };
  }, [user.id]);

  async function handleBookingAction(id: string, status: "approved" | "rejected") {
    const note = prompt(`Optional admin note for this ${status}:`, "") ?? "";
    const { error } = await supabase
      .from("resource_bookings")
      .update({ status, admin_note: note })
      .eq("id", id);
    if (error) return alert(error.message);
    loadAdminData();
  }

  const name =
    displayName ??
    (user.user_metadata as { display_name?: string } | undefined)?.display_name ??
    user.email?.split("@")[0] ??
    "member";

  const cards = [
    {
      t: "Active projects",
      v: activeProjects,
      to: "/projects",
      label: "View board",
    },
    {
      t: "My submissions",
      v: mySubs,
      to: "/submit",
      label: "New submission",
    },
    {
      t: "Unread forum threads",
      v: forumUnread,
      to: "/forum",
      label: forumUnread > 0 ? "Catch up ?" : "Open forum",
      accent: forumUnread > 0,
    },
    {
      t: "Unread messages",
      v: dmUnread,
      to: "/messages",
      label: dmUnread > 0 ? "Read now ?" : "Open inbox",
      accent: dmUnread > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Aeroforge · Overview /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Welcome back, {name}.
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.t}
            className={`hud-panel corner-brackets p-5 ${c.accent ? "border-primary/60" : ""}`}
          >
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {c.t}
            </p>
            <p
              className={`mono mt-2 text-3xl font-bold ${c.accent ? "text-primary hud-glow" : "text-foreground"}`}
            >
              {c.v}
            </p>
            <Link
              to={c.to}
              className="mono mt-4 inline-block text-[10px] uppercase tracking-widest text-primary hover:underline"
            >
              {c.label}
            </Link>
          </div>
        ))}
      </div>

      {isAdmin && pendingBookings.length > 0 && (
        <section className="space-y-3 rounded-md border border-command/45 bg-command/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="mono text-xs uppercase tracking-widest text-command font-bold">
              ? Admin Pending Bookings Queue ({pendingBookings.length})
            </h2>
          </div>
          <ul className="space-y-2">
            {pendingBookings.map((b) => (
              <li
                key={b.id}
                className="hud-panel corner-brackets p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="mono rounded bg-command/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-command font-bold">
                      {b.kind === "club_room" ? "Club Room" : "3D Printer"}
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {b.purpose}
                    </p>
                  </div>
                  <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Requested by: {profiles[b.user_id] ?? "Member"} · {new Date(b.start_at).toLocaleString()} ? {new Date(b.end_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBookingAction(b.id, "approved")}
                    className="mono rounded border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/20"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleBookingAction(b.id, "rejected")}
                    className="mono rounded border border-destructive/40 bg-destructive/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/20"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}