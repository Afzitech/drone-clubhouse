import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [unreadDm, setUnreadDm] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("display_name,avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      if (!alive) return;
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
      setAvatarUrl(profile?.avatar_url ?? null);
      setDisplayName(profile?.display_name ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [user.id]);

  useEffect(() => {
    let alive = true;
    async function loadCounts() {
      const [{ count: n }, { count: d }] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null),
        supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null),
      ]);
      if (!alive) return;
      setUnread(n ?? 0);
      setUnreadDm(d ?? 0);
    }
    loadCounts();
    const iv = setInterval(loadCounts, 30_000);
    const nCh = supabase
      .channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, loadCounts)
      .subscribe();
    const dCh = supabase
      .channel(`dm:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${user.id}` }, loadCounts)
      .subscribe();
    return () => {
      alive = false;
      clearInterval(iv);
      supabase.removeChannel(nCh);
      supabase.removeChannel(dCh);
    };
  }, [user.id]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: "▤" },
    { to: "/projects", label: "Projects", icon: "◈" },
    { to: "/announcements", label: "News", icon: "◉" },
    { to: "/events", label: "Events", icon: "▦" },
    { to: "/forum", label: "Forum", icon: "◫" },
    { to: "/gallery", label: "Gallery", icon: "▣" },
    { to: "/resources", label: "Library", icon: "▤" },
    { to: "/members", label: "Members", icon: "☰" },
    { to: "/messages", label: "Messages", icon: "✉" },
    { to: "/bookings/room", label: "Club Room", icon: "◱" },
    { to: "/bookings/printer", label: "3D Printer", icon: "◆" },
    { to: "/submit", label: "Submit", icon: "↥" },
    { to: "/settings", label: "Settings", icon: "◎" },
  ] as const;

  const initials = (displayName ?? user.email ?? "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-screen">
      <header className="hud-panel sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="mono flex h-9 w-9 items-center justify-center rounded-md border border-border text-lg text-foreground transition hover:border-primary/60 hover:text-primary"
            >
              ≡
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="hud-panel corner-brackets flex h-7 w-7 items-center justify-center">
                <span className="mono text-[10px] font-bold text-primary">AF</span>
              </div>
              <span className={`mono text-xs font-semibold uppercase tracking-widest text-foreground ${isAdmin ? "hidden sm:inline" : ""}`}>
                Aeroforge
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/messages"
              className="relative mono rounded-md border border-border px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
              title="Messages"
              aria-label="Messages"
            >
              ✉
              {unreadDm > 0 && (
                <span className="mono absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-command px-1 text-[9px] font-bold text-command-foreground">
                  {unreadDm > 9 ? "9+" : unreadDm}
                </span>
              )}
            </Link>
            <Link
              to="/notifications"
              className="relative mono rounded-md border border-border px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
              title="Notifications"
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="mono absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            {isAdmin && <AdminBadgeLink />}
            <Link
              to="/settings"
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1 transition hover:bg-accent"
              title="Settings"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="mono flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                  {initials}
                </div>
              )}
            </Link>
            <button
              onClick={signOut}
              className="mono rounded-md border border-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 border-r border-border bg-background/95 backdrop-blur transition-transform duration-200 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="mono text-[11px] uppercase tracking-widest text-primary">
            / Nav /
          </span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="mono h-8 w-8 rounded-md border border-border text-foreground hover:text-primary"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {links.map((l) => (
            <DrawerLink
              key={l.to}
              to={l.to}
              label={l.label}
              icon={l.icon}
              onClick={() => setDrawerOpen(false)}
            />
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setDrawerOpen(false)}
              className="mono mt-2 flex items-center gap-3 rounded-md border border-command/40 bg-command/10 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-command transition hover:bg-command/20"
              activeProps={{ className: "bg-command/20" }}
            >
              <span className="w-4 text-center">✦</span>
              Command Center
            </Link>
          )}
        </nav>
      </aside>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function DrawerLink({
  to,
  label,
  icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="mono flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
      activeProps={{
        className: "border-primary/40 bg-primary/10 text-primary",
      }}
    >
      <span className="w-4 text-center">{icon}</span>
      {label}
    </Link>
  );
}

function AdminBadgeLink() {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    let alive = true;
    async function load() {
      const [{ count: s }, { count: u }, { count: b }] = await Promise.all([
        supabase.from("project_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("project_updates").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("resource_bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      if (alive) setPending((s ?? 0) + (u ?? 0) + (b ?? 0));
    }
    load();
    const iv = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);
  return (
    <Link
      to="/admin"
      className="relative mono rounded-md border border-command/40 bg-command/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-command transition hover:bg-command/20"
    >
      Command
      {pending > 0 && (
        <span className="mono absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
          {pending > 9 ? "9+" : pending}
        </span>
      )}
    </Link>
  );
}
