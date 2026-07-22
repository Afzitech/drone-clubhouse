import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { notifyAllMembers } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/events")({
  component: EventsPage,
});

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  created_by: string;
};

function EventsPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<EventRow[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    starts_at: "",
    ends_at: "",
  });
  const [busy, setBusy] = useState(false);
  const notify = useServerFn(notifyAllMembers);

  async function load() {
    const { data } = await supabase
      .from("events")
      .select("id,title,description,location,starts_at,ends_at,created_by")
      .order("starts_at", { ascending: true });
    setItems((data ?? []) as EventRow[]);
  }

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const list = (roles ?? []).map((r) => r.role);
      setCanPost(list.includes("admin") || list.includes("lead"));
      setIsAdmin(list.includes("admin"));
      load();
    })();
  }, [user.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("events").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      created_by: user.id,
    });
    if (error) {
      setBusy(false);
      return alert(error.message);
    }
    try {
      await notify({
        data: {
          type: "event",
          title: `New event: ${form.title.trim()}`,
          body: `${new Date(form.starts_at).toLocaleString()}${form.location ? " · " + form.location : ""}`,
          link: "/events",
        },
      });
    } catch {
      /* ignore */
    }
    setForm({
      title: "",
      description: "",
      location: "",
      starts_at: "",
      ends_at: "",
    });
    setBusy(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return alert(error.message);
    setItems((x) => x.filter((e) => e.id !== id));
  }

  const now = Date.now();
  const upcoming = items.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = items.filter((e) => new Date(e.starts_at).getTime() < now);

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Ops · Event calendar /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Events</h1>
      </div>

      {canPost && (
        <form
          onSubmit={submit}
          className="hud-panel corner-brackets grid gap-3 p-5 md:grid-cols-2"
        >
          <p className="mono md:col-span-2 text-[10px] uppercase tracking-widest text-command">
            / Schedule new event /
          </p>
          <input
            className="hud-input md:col-span-2"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            maxLength={140}
          />
          <input
            className="hud-input"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) =>
              setForm((f) => ({ ...f, starts_at: e.target.value }))
            }
            required
          />
          <input
            className="hud-input"
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) =>
              setForm((f) => ({ ...f, ends_at: e.target.value }))
            }
          />
          <input
            className="hud-input md:col-span-2"
            placeholder="Location (optional)"
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
            maxLength={200}
          />
          <textarea
            className="hud-input md:col-span-2 min-h-[80px]"
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            maxLength={1000}
          />
          <button
            disabled={busy}
            className="mono md:col-span-2 rounded border border-command/40 bg-command/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-command hover:bg-command/20 disabled:opacity-50"
          >
            {busy ? "Publishing…" : "Publish & notify"}
          </button>
        </form>
      )}

      <EventList
        title="Upcoming"
        items={upcoming}
        isAdmin={isAdmin}
        onDelete={remove}
      />
      <EventList
        title="Past"
        items={past.slice().reverse()}
        isAdmin={isAdmin}
        onDelete={remove}
        muted
      />
    </div>
  );
}

function EventList({
  title,
  items,
  isAdmin,
  onDelete,
  muted,
}: {
  title: string;
  items: EventRow[];
  isAdmin: boolean;
  onDelete: (id: string) => void;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-3">
        {items.map((e) => (
          <li
            key={e.id}
            className={`hud-panel corner-brackets p-5 ${muted ? "opacity-70" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {e.title}
                </h3>
                <p className="mono mt-1 text-[11px] uppercase tracking-widest text-primary">
                  {new Date(e.starts_at).toLocaleString()}
                  {e.ends_at
                    ? ` → ${new Date(e.ends_at).toLocaleString()}`
                    : ""}
                </p>
                {e.location && (
                  <p className="mono mt-1 text-[10px] text-muted-foreground">
                    📍 {e.location}
                  </p>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => onDelete(e.id)}
                  className="mono rounded border border-destructive/40 px-2 py-1 text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/10"
                >
                  Delete
                </button>
              )}
            </div>
            {e.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {e.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
