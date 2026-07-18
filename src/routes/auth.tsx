import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapFirstAdmin, bootstrapStatus } from "@/lib/bootstrap.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [showBootstrap, setShowBootstrap] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    bootstrapStatus()
      .then((r) => setHasAdmin(r.hasAdmin))
      .catch(() => setHasAdmin(true));
  }, [navigate]);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function onBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await bootstrapFirstAdmin({
        data: { email: email.trim().toLowerCase(), password },
      });
      setNotice("Admin account created. Sign in below.");
      setShowBootstrap(false);
      setHasAdmin(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bootstrap failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div
          className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 20%, transparent) 0%, transparent 60%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link
          to="/"
          className="mono mb-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          ← Return to base
        </Link>

        <div className="hud-panel hud-glow corner-brackets p-8">
          <div className="mb-6 text-center">
            <div className="mono mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-widest text-primary">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Secure uplink
            </div>
            <h1 className="mono text-xl font-bold uppercase tracking-widest text-foreground">
              {showBootstrap ? "Bootstrap Admin" : "Member Sign In"}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              {showBootstrap
                ? "One-time setup for the first admin."
                : "Enter your credentials to access the flight deck."}
            </p>
          </div>

          <form onSubmit={showBootstrap ? onBootstrap : onSignIn} className="space-y-4">
            <div>
              <label className="mono block text-[10px] uppercase tracking-widest text-muted-foreground">
                Email / Callsign
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mono mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="pilot@drone.club"
              />
            </div>

            <div>
              <label className="mono block text-[10px] uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                autoComplete={showBootstrap ? "new-password" : "current-password"}
                required
                minLength={showBootstrap ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mono mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="mono rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p className="mono rounded border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mono hud-glow w-full rounded-md bg-primary py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Standby…"
                : showBootstrap
                  ? "Create admin"
                  : "Authenticate"}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center">
            {hasAdmin === false && !showBootstrap && (
              <button
                onClick={() => {
                  setShowBootstrap(true);
                  setError(null);
                  setNotice(null);
                }}
                className="mono text-[10px] uppercase tracking-widest text-command hover:underline"
              >
                First-time setup: bootstrap admin
              </button>
            )}
            {showBootstrap && (
              <button
                onClick={() => setShowBootstrap(false)}
                className="mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
              >
                ← Back to sign in
              </button>
            )}
            {hasAdmin === true && !showBootstrap && (
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Need access? Ask an admin for credentials.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
