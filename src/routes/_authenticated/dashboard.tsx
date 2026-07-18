import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Flight deck · Overview /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Welcome back, pilot.
        </h1>
        <p className="mono mt-1 text-xs text-muted-foreground">{user.email}</p>
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
          Foundations online. Modules for projects, submissions, forum, and admin command
          are being brought up next.
        </p>
      </div>
    </div>
  );
}
