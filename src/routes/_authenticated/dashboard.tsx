import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setDisplayName(data?.display_name ?? null);
      });
    return () => {
      alive = false;
    };
  }, [user.id]);

  const name =
    displayName ??
    (user.user_metadata as { display_name?: string } | undefined)?.display_name ??
    user.email?.split("@")[0] ??
    "member";

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { t: "Active projects", v: "—", to: "/projects", label: "View board" },
          { t: "My submissions", v: "—", to: "/submit", label: "New submission" },
          { t: "Forum activity", v: "—", to: "/forum", label: "Open forum" },
        ].map((c) => (
          <div key={c.t} className="hud-panel corner-brackets p-5">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {c.t}
            </p>
            <p className="mono mt-2 text-3xl font-bold text-primary">{c.v}</p>
            <Link
              to={c.to}
              className="mono mt-4 inline-block text-[10px] uppercase tracking-widest text-primary hover:underline"
            >
              {c.label} →
            </Link>
          </div>
        ))}
      </div>

      <div className="hud-panel p-6">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Status
        </p>
        <p className="mt-2 text-sm text-foreground">
          Foundations online. Announcements, calendar, showcase, and notifications
          coming online next.
        </p>
      </div>
    </div>
  );
}
