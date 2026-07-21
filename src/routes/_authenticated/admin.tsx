import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  adminCreateMember,
  adminListMembers,
  adminDeleteMember,
  adminSetLead,
} from "@/lib/admin.functions";
import {
  getLandingContent,
  updateLandingContent,
  type LandingContent,
} from "@/lib/site-content.functions";
import { StatusPill } from "./submit";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", (context as { user: { id: string } }).user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

type Submission = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  media_url: string | null;
  status: "pending" | "approved" | "rejected";
  submitter_id: string;
  admin_note: string | null;
  created_at: string;
};

type Profile = { id: string; display_name: string | null };

function AdminPage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<"queue" | "members" | "create" | "landing">(
    "queue",
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-command">
          / Command · Admin console /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Command Center</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["queue", "Submissions queue"],
            ["members", "Members"],
            ["create", "Create member"],
            ["landing", "Landing page"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`mono rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-widest transition ${
              tab === id
                ? "border-command/60 bg-command/20 text-command"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "queue" ? (
        <SubmissionsQueue adminId={user.id} />
      ) : tab === "members" ? (
        <MembersList currentUserId={user.id} />
      ) : tab === "create" ? (
        <CreateMember />
      ) : (
        <LandingEditor />
      )}
    </div>
  );
}

function SubmissionsQueue({ adminId }: { adminId: string }) {
  const [items, setItems] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  async function load() {
    let q = supabase
      .from("project_submissions")
      .select(
        "id,title,summary,description,media_url,status,submitter_id,admin_note,created_at",
      )
      .order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    const list = (data ?? []) as Submission[];
    setItems(list);
    const ids = Array.from(new Set(list.map((s) => s.submitter_id)));
    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", ids);
      const map: Record<string, Profile> = {};
      (p ?? []).forEach((row) => (map[row.id] = row));
      setProfiles(map);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function approve(s: Submission) {
    setBusy(s.id);
    // 1) Update submission status
    const { error: upErr } = await supabase
      .from("project_submissions")
      .update({
        status: "approved",
        admin_note: notes[s.id] ?? null,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    if (upErr) {
      setBusy(null);
      return alert(upErr.message);
    }
    // 2) Create project row
    const { error: insErr } = await supabase.from("projects").insert({
      title: s.title,
      description: s.description ?? s.summary,
      status: "planning",
      lead_user_id: s.submitter_id,
    });
    if (insErr) {
      setBusy(null);
      return alert(`Approved, but failed to create project: ${insErr.message}`);
    }
    setBusy(null);
    load();
  }

  async function reject(s: Submission) {
    setBusy(s.id);
    const { error } = await supabase
      .from("project_submissions")
      .update({
        status: "rejected",
        admin_note: notes[s.id] ?? null,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    setBusy(null);
    if (error) return alert(error.message);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`mono rounded border px-2 py-1 text-[10px] uppercase tracking-widest ${
              filter === f
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="hud-panel p-6 text-center">
          <p className="mono text-xs text-muted-foreground">
            Queue clear. No submissions.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="hud-panel corner-brackets p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mono mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {profiles[s.submitter_id]?.display_name ?? "pilot"} ·{" "}
                    {new Date(s.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusPill status={s.status} />
              </div>
              {s.summary && (
                <p className="mt-2 text-sm text-foreground">{s.summary}</p>
              )}
              {s.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {s.description}
                </p>
              )}
              {s.media_url && (
                <a
                  href={s.media_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono mt-2 inline-block text-[11px] text-primary hover:underline"
                >
                  Media link ↗
                </a>
              )}
              {s.status === "pending" && (
                <div className="mt-4 space-y-2">
                  <input
                    className="hud-input"
                    placeholder="Optional note to submitter"
                    value={notes[s.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [s.id]: e.target.value }))
                    }
                    maxLength={500}
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={busy === s.id}
                      onClick={() => approve(s)}
                      className="mono rounded border border-primary/40 bg-primary/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-primary transition hover:bg-primary/20 disabled:opacity-50"
                    >
                      Approve → project
                    </button>
                    <button
                      disabled={busy === s.id}
                      onClick={() => reject(s)}
                      className="mono rounded border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
              {s.status !== "pending" && s.admin_note && (
                <p className="mono mt-3 text-[11px] text-command">
                  Note: {s.admin_note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateMember() {
  const createMember = useServerFn(adminCreateMember);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await createMember({
        data: { displayName: displayName.trim(), email: email.trim(), password },
      });
      setMsg({ ok: true, text: `Member ${email} created.` });
      setDisplayName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Failed to create member.",
      });
    } finally {
      setBusy(false);
    }
  }

  function generatePassword() {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let out = "";
    const buf = new Uint32Array(16);
    crypto.getRandomValues(buf);
    for (let i = 0; i < 16; i++) out += chars[buf[i] % chars.length];
    setPassword(out);
  }

  return (
    <form
      onSubmit={submit}
      className="hud-panel corner-brackets max-w-lg space-y-4 p-6"
    >
      <p className="mono text-[10px] uppercase tracking-widest text-command">
        / Onboard new pilot /
      </p>
      <label className="block">
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Display name *
        </span>
        <input
          className="hud-input mt-1"
          required
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Email *
        </span>
        <input
          className="hud-input mt-1"
          required
          type="email"
          maxLength={255}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Password * (min 8)
        </span>
        <div className="mt-1 flex gap-2">
          <input
            className="hud-input flex-1"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={generatePassword}
            className="mono rounded border border-border px-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Gen
          </button>
        </div>
      </label>
      {msg && (
        <p
          className={`mono text-xs ${
            msg.ok ? "text-primary" : "text-destructive"
          }`}
        >
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mono rounded-md border border-command/40 bg-command/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-command transition hover:bg-command/20 disabled:opacity-50"
      >
        {busy ? "Provisioning…" : "Create member"}
      </button>
      <p className="mono text-[10px] text-muted-foreground">
        Deliver credentials to the pilot securely. They can sign in immediately.
      </p>
    </form>
  );
}

type Member = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
  createdAt: string;
};

function MembersList({ currentUserId }: { currentUserId: string }) {
  const listMembers = useServerFn(adminListMembers);
  const deleteMember = useServerFn(adminDeleteMember);
  const setLead = useServerFn(adminSetLead);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = (await listMembers()) as Member[];
      data.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(m: Member) {
    if (m.id === currentUserId) return;
    if (
      !confirm(
        `Delete ${m.displayName ?? m.email}? This removes their account and access permanently.`,
      )
    )
      return;
    setBusy(m.id);
    try {
      await deleteMember({ data: { userId: m.id } });
      setMembers((prev) => (prev ?? []).filter((x) => x.id !== m.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete member.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleLead(m: Member) {
    const nextIsLead = !m.roles.includes("lead");
    setBusy(m.id);
    try {
      await setLead({ data: { userId: m.id, isLead: nextIsLead } });
      setMembers((prev) =>
        (prev ?? []).map((x) =>
          x.id === m.id
            ? {
                ...x,
                roles: nextIsLead
                  ? Array.from(new Set([...x.roles, "lead"]))
                  : x.roles.filter((r) => r !== "lead"),
              }
            : x,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="hud-panel p-6">
        <p className="mono text-xs text-destructive">{error}</p>
      </div>
    );
  }

  if (members === null) {
    return (
      <p className="mono text-xs text-muted-foreground">Loading roster…</p>
    );
  }

  if (members.length === 0) {
    return (
      <div className="hud-panel p-6 text-center">
        <p className="mono text-xs text-muted-foreground">No members on file.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {members.map((m) => {
        const isSelf = m.id === currentUserId;
        const isAdmin = m.roles.includes("admin");
        const isLead = m.roles.includes("lead");
        return (
          <li
            key={m.id}
            className={`hud-panel corner-brackets flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between ${
              isLead ? "border-command/50" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {m.displayName ?? "(no name)"}
                </p>
                {isAdmin && (
                  <span className="mono rounded border border-command/40 bg-command/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-command">
                    Admin
                  </span>
                )}
                {isLead && (
                  <span className="mono rounded border border-warning/50 bg-warning/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-warning">
                    ★ Project Lead
                  </span>
                )}
                {isSelf && (
                  <span className="mono rounded border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                    You
                  </span>
                )}
              </div>
              <p className="mono mt-1 truncate text-[11px] text-muted-foreground">
                {m.email}
              </p>
              <p className="mono mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                Joined {new Date(m.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:self-center">
              <button
                disabled={busy === m.id || isAdmin}
                onClick={() => toggleLead(m)}
                title={isAdmin ? "Admins are already leads by role" : undefined}
                className="mono rounded border border-warning/40 bg-warning/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-warning transition hover:bg-warning/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isLead ? "Remove lead" : "Make lead"}
              </button>
              <button
                disabled={isSelf || busy === m.id}
                onClick={() => remove(m)}
                className="mono rounded border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-destructive transition hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {busy === m.id ? "…" : "Delete"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LandingEditor() {
  const load = useServerFn(getLandingContent);
  const save = useServerFn(updateLandingContent);
  const [content, setContent] = useState<LandingContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    load().then((c) => setContent(c as LandingContent));
  }, [load]);

  if (!content) {
    return (
      <p className="mono text-xs text-muted-foreground">Loading content…</p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content) return;
    setBusy(true);
    setMsg(null);
    try {
      await save({ data: content });
      setMsg({ ok: true, text: "Landing page updated." });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Failed to save.",
      });
    } finally {
      setBusy(false);
    }
  }

  const field = (
    key: keyof LandingContent,
    label: string,
    multiline = false,
  ) => (
    <label key={key} className="block">
      <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {multiline ? (
        <textarea
          className="hud-input mt-1 min-h-[100px]"
          value={content[key]}
          onChange={(e) =>
            setContent((c) => (c ? { ...c, [key]: e.target.value } : c))
          }
        />
      ) : (
        <input
          className="hud-input mt-1"
          value={content[key]}
          onChange={(e) =>
            setContent((c) => (c ? { ...c, [key]: e.target.value } : c))
          }
        />
      )}
    </label>
  );

  return (
    <form
      onSubmit={submit}
      className="hud-panel corner-brackets max-w-2xl space-y-4 p-6"
    >
      <p className="mono text-[10px] uppercase tracking-widest text-command">
        / Edit public landing page /
      </p>
      {field("hero_eyebrow", "Hero eyebrow")}
      {field("hero_title", "Hero title")}
      {field("hero_accent", "Hero accent (colored text)")}
      {field("hero_subtitle", "Hero subtitle", true)}
      <div className="border-t border-border/50 pt-4">
        {field("about_title", "About title")}
        {field("about_body", "About body", true)}
      </div>
      <div className="border-t border-border/50 pt-4">
        {field("mission_title", "Mission title")}
        {field("mission_body", "Mission body", true)}
      </div>
      {msg && (
        <p
          className={`mono text-xs ${msg.ok ? "text-primary" : "text-destructive"}`}
        >
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mono rounded-md border border-command/40 bg-command/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-command transition hover:bg-command/20 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save landing page"}
      </button>
    </form>
  );
}
