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
    async function loadUnread() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (alive) setUnread(count ?? 0);
    }
    loadUnread();
    const iv = setInterval(loadUnread, 30_000);
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadUnread(),
      )
      .subscribe();
    return () => {
      alive = false;
      clearInterval(iv);
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/projects", label: "Projects" },
    { to: "/announcements", label: "News" },
    { to: "/events", label: "Events" },
    { to: "/forum", label: "Forum" },
    { to: "/gallery", label: "Gallery" },
    { to: "/resources", label: "Library" },
    { to: "/submit", label: "Submit" },
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
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="hud-panel corner-brackets flex h-7 w-7 items-center justify-center">
                <span className="mono text-[10px] font-bold text-primary">AF</span>
              </div>
              <span className="mono text-xs font-semibold uppercase tracking-widest text-foreground">
                Aeroforge
              </span>
            </Link>
            <nav className="hidden items-center gap-4 lg:flex">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="mono text-[11px] uppercase tracking-widest text-muted-foreground transition hover:text-primary"
                  activeProps={{ className: "text-primary" }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
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
            {isAdmin && (
              <Link
                to="/admin"
                className="mono rounded-md border border-command/40 bg-command/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-command transition hover:bg-command/20"
              >
                Command
              </Link>
            )}
            <Link
              to="/settings"
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1 transition hover:bg-accent"
              title="Settings"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
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
        {/* mobile nav */}
        <nav className="mx-auto flex max-w-6xl gap-3 overflow-x-auto border-t border-border/50 px-4 py-2 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="mono whitespace-nowrap text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
