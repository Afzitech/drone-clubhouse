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

  useEffect(() => {
    let alive = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!alive) return;
        setIsAdmin((data ?? []).some((r) => r.role === "admin"));
      });
    return () => {
      alive = false;
    };
  }, [user.id]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="hud-panel sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="hud-panel corner-brackets flex h-7 w-7 items-center justify-center">
                <span className="mono text-[10px] font-bold text-primary">AF</span>
              </div>
              <span className="mono text-xs font-semibold uppercase tracking-widest text-foreground">
                Aeroforge
              </span>
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              {[
                { to: "/dashboard", label: "Dashboard" },
                { to: "/projects", label: "Projects" },
                { to: "/submit", label: "Submit" },
                { to: "/forum", label: "Forum" },
              ].map((l) => (
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
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="mono rounded-md border border-command/40 bg-command/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-command transition hover:bg-command/20"
              >
                Command
              </Link>
            )}
            <button
              onClick={signOut}
              className="mono rounded-md border border-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
