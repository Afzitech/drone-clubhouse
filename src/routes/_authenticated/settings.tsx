import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<"profile" | "security">("profile");

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Pilot settings /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">My account</h1>
        <p className="mono mt-1 text-xs text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["profile", "Profile"],
            ["security", "Security"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`mono rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-widest transition ${
              tab === id
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "profile" ? <ProfileForm userId={user.id} /> : <SecurityForm />}
    </div>
  );
}

function ProfileForm({ userId }: { userId: string }) {
  const [displayName, setDisplayName] = useState("");
  const [initial, setInitial] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const v = data?.display_name ?? "";
        setDisplayName(v);
        setInitial(v);
      });
  }, [userId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const trimmed = displayName.trim();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setInitial(trimmed);
    setMsg({ ok: true, text: "Profile updated." });
  }

  return (
    <form
      onSubmit={save}
      className="hud-panel corner-brackets max-w-lg space-y-4 p-6"
    >
      <label className="block">
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Display name
        </span>
        <input
          className="hud-input mt-1"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          required
        />
      </label>
      {msg && (
        <p className={`mono text-xs ${msg.ok ? "text-primary" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || displayName.trim() === initial}
        className="mono rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/20 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function SecurityForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) return setMsg({ ok: false, text: "Min 8 characters." });
    if (password !== confirm)
      return setMsg({ ok: false, text: "Passwords do not match." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setPassword("");
    setConfirm("");
    setMsg({ ok: true, text: "Password updated." });
  }

  return (
    <form
      onSubmit={save}
      className="hud-panel corner-brackets max-w-lg space-y-4 p-6"
    >
      <p className="mono text-[10px] uppercase tracking-widest text-command">
        / Change password /
      </p>
      <label className="block">
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          New password (min 8)
        </span>
        <input
          type="password"
          className="hud-input mt-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={72}
          required
          autoComplete="new-password"
        />
      </label>
      <label className="block">
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Confirm password
        </span>
        <input
          type="password"
          className="hud-input mt-1"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          maxLength={72}
          required
          autoComplete="new-password"
        />
      </label>
      {msg && (
        <p className={`mono text-xs ${msg.ok ? "text-primary" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mono rounded-md border border-command/40 bg-command/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-command transition hover:bg-command/20 disabled:opacity-40"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
