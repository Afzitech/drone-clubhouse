import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* radar sweep glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 15%, transparent) 0%, transparent 60%)",
          }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="hud-panel corner-brackets flex h-8 w-8 items-center justify-center">
            <span className="mono text-xs font-bold text-primary">DC</span>
          </div>
          <span className="mono text-sm font-semibold uppercase tracking-widest text-foreground">
            Drone Club
          </span>
        </div>
        <Link
          to={signedIn ? "/dashboard" : "/auth"}
          className="mono rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary transition hover:bg-primary/20"
        >
          {signedIn ? "Flight Deck" : "Member Sign in"}
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-4xl flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="mono text-[10px] uppercase tracking-[0.4em] text-primary">
          / Restricted airspace · Members only /
        </p>
        <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
          Flight ops portal
          <br />
          <span className="text-primary">for the drone club.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground">
          Track live project status, submit new builds for approval, and coordinate with
          fellow pilots — all in one secured hangar.
        </p>

        <div className="mt-10">
          <Link
            to={signedIn ? "/dashboard" : "/auth"}
            className="mono hud-glow inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
          >
            {signedIn ? "Enter flight deck" : "Sign in to continue"}
            <span aria-hidden>→</span>
          </Link>
          <p className="mono mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
            Access provided by club admins
          </p>
        </div>

        <div className="mt-20 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { k: "01", t: "Project Status", d: "Live board of active builds & missions." },
            { k: "02", t: "Submissions", d: "Pitch new projects; admin approves." },
            { k: "03", t: "Forum", d: "Discussion channels for the squadron." },
          ].map((f) => (
            <div key={f.k} className="hud-panel corner-brackets p-5 text-left">
              <p className="mono text-[10px] uppercase tracking-widest text-primary">
                Module {f.k}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
