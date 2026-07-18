import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/submit")({
  component: SubmitPage,
});

type Submission = {
  id: string;
  title: string;
  summary: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
};

function SubmitPage() {
  const { user } = Route.useRouteContext();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Submission[]>([]);

  async function load() {
    const { data, error } = await supabase
      .from("project_submissions")
      .select("id,title,summary,status,admin_note,created_at")
      .eq("submitter_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as Submission[]);
  }

  useEffect(() => {
    load();
  }, [user.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("project_submissions").insert({
      submitter_id: user.id,
      title: title.trim(),
      summary: summary.trim() || null,
      description: description.trim() || null,
      media_url: mediaUrl.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTitle("");
    setSummary("");
    setDescription("");
    setMediaUrl("");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Flight deck · Submission bay /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Submit Project</h1>
        <p className="mono mt-1 text-xs text-muted-foreground">
          Submissions require command approval before entering the active board.
        </p>
      </div>

      <form onSubmit={onSubmit} className="hud-panel corner-brackets space-y-4 p-6">
        <Field label="Project title" required>
          <input
            className="hud-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
        </Field>
        <Field label="Summary">
          <input
            className="hud-input"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={240}
            placeholder="One-line pitch"
          />
        </Field>
        <Field label="Description">
          <textarea
            className="hud-input min-h-32"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            placeholder="Objectives, hardware, mission profile…"
          />
        </Field>
        <Field label="Media URL">
          <input
            className="hud-input"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            maxLength={500}
            placeholder="https://…"
            type="url"
          />
        </Field>
        {error && (
          <p className="mono text-xs text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mono rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/20 disabled:opacity-50"
        >
          {submitting ? "Transmitting…" : "Transmit submission"}
        </button>
      </form>

      <div className="space-y-3">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          / My submissions /
        </p>
        {items.length === 0 ? (
          <div className="hud-panel p-6 text-center">
            <p className="mono text-xs text-muted-foreground">
              No submissions yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.id} className="hud-panel p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{s.title}</p>
                    {s.summary && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {s.summary}
                      </p>
                    )}
                    {s.admin_note && (
                      <p className="mono mt-2 text-[11px] text-command">
                        Command note: {s.admin_note}
                      </p>
                    )}
                  </div>
                  <StatusPill status={s.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    approved: "border-primary/40 bg-primary/10 text-primary",
    rejected: "border-destructive/40 bg-destructive/10 text-destructive",
    planning: "border-muted-foreground/30 bg-muted/20 text-muted-foreground",
    in_progress: "border-primary/40 bg-primary/10 text-primary",
    testing: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
    completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    archived: "border-muted-foreground/30 bg-muted/20 text-muted-foreground",
  };
  const cls = map[status] ?? "border-border bg-muted/20 text-muted-foreground";
  return (
    <span
      className={`mono shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${cls}`}
    >
      {status}
    </span>
  );
}
