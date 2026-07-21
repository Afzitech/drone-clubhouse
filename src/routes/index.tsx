import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLandingContent } from "@/lib/site-content.functions";

const landingQuery = queryOptions({
  queryKey: ["landing-content"],
  queryFn: () => getLandingContent(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aeroforge — Drone Club" },
      {
        name: "description",
        content:
          "Aeroforge is a private drone & robotics club — collaborate on builds, track flight ops, and push the sky.",
      },
      { property: "og:title", content: "Aeroforge — Drone Club" },
      {
        property: "og:description",
        content:
          "Aeroforge is a private drone & robotics club — collaborate on builds, track flight ops, and push the sky.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(landingQuery),
  component: Landing,
});

function Landing() {
  const { data: content } = useSuspenseQuery(landingQuery);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient radar glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div
          className="absolute left-1/2 top-1/3 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 15%, transparent) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Fixed top-right nav */}
      <header className="fixed left-0 right-0 top-0 z-40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="flex items-center gap-2">
            <div className="hud-panel corner-brackets flex h-8 w-8 items-center justify-center">
              <span className="mono text-xs font-bold text-primary">AF</span>
            </div>
            <span className="mono text-sm font-semibold uppercase tracking-widest text-foreground">
              Aeroforge
            </span>
          </a>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-5">
              {[
                ["about", "About"],
                ["mission", "Mission"],
                ["hangar", "Hangar"],
              ].map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="mono text-[11px] uppercase tracking-widest text-muted-foreground transition hover:text-primary"
                >
                  {label}
                </a>
              ))}
            </nav>
            <Link
              to={signedIn ? "/dashboard" : "/auth"}
              className="mono rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/20"
            >
              {signedIn ? "Flight deck" : "Member login"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        id="top"
        className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center"
      >
        <p className="mono text-[10px] uppercase tracking-[0.4em] text-primary">
          / {content.hero_eyebrow} /
        </p>
        <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
          {content.hero_title}
          <br />
          <span className="text-primary">{content.hero_accent}</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground">
          {content.hero_subtitle}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={signedIn ? "/dashboard" : "/auth"}
            className="mono hud-glow inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
          >
            {signedIn ? "Enter flight deck" : "Sign in"}
            <span aria-hidden>→</span>
          </Link>
          <a
            href="#about"
            className="mono inline-flex items-center gap-2 rounded-md border border-border bg-surface px-6 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition hover:bg-accent"
          >
            Learn more
          </a>
        </div>
        <div className="mono absolute bottom-8 text-[10px] uppercase tracking-widest text-muted-foreground">
          scroll · about · mission ↓
        </div>
      </section>

      <FlightPathDivider />

      {/* About */}
      <section
        id="about"
        className="relative z-10 mx-auto max-w-4xl px-6 py-24"
      >
        <p className="mono text-[10px] uppercase tracking-[0.4em] text-primary">
          / Section 01 · Overview /
        </p>
        <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
          {content.about_title}
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="hud-panel corner-brackets p-8">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
              {content.about_body}
            </p>
          </div>
          <div className="space-y-3">
            {[
              ["Projects", "Track builds from concept to first flight."],
              ["Forum", "Coordinate with fellow pilots and engineers."],
              ["Ops", "Approvals, telemetry, and admin controls."],
            ].map(([t, d]) => (
              <div key={t} className="hud-panel p-4">
                <p className="mono text-[10px] uppercase tracking-widest text-primary">
                  {t}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FlightPathDivider />

      {/* Mission */}
      <section
        id="mission"
        className="relative z-10 mx-auto max-w-4xl px-6 py-24"
      >
        <p className="mono text-[10px] uppercase tracking-[0.4em] text-primary">
          / Section 02 · Mission /
        </p>
        <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
          {content.mission_title}
        </h2>
        <div className="hud-panel corner-brackets mt-8 p-8">
          <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground/90">
            {content.mission_body}
          </p>
        </div>
      </section>

      <FlightPathDivider />

      {/* Hangar placeholder for public gallery (populated in phase 3) */}
      <section
        id="hangar"
        className="relative z-10 mx-auto max-w-6xl px-6 py-24"
      >
        <p className="mono text-[10px] uppercase tracking-[0.4em] text-primary">
          / Section 03 · Hangar /
        </p>
        <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
          Featured builds
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Members' work goes here — the public showcase gallery activates once
          approved projects have media featured.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="hud-panel corner-brackets aspect-video flex items-center justify-center"
            >
              <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                slot 0{i} · empty
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 px-6 py-8 text-center">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Aeroforge © · Members only · Access granted by admins
        </p>
      </footer>
    </div>
  );
}

function FlightPathDivider() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <div className="flex items-center gap-3 text-primary/40">
        <div className="mono text-[9px] uppercase tracking-widest">wpt</div>
        <div className="h-px flex-1 border-t border-dashed border-primary/40" />
        <div className="h-1.5 w-1.5 rotate-45 bg-primary/60" />
        <div className="h-px flex-1 border-t border-dashed border-primary/40" />
        <div className="mono text-[9px] uppercase tracking-widest">wpt</div>
      </div>
    </div>
  );
}
