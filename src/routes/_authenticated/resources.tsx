import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/resources")({
  component: ResourcesPage,
});

type Resource = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string | null;
  created_at: string;
};

function ResourcesPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Resource[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    url: "",
    category: "",
  });
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    const { data } = await supabase
      .from("resources")
      .select("id,title,description,url,category,created_at")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Resource[]);
  }

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const list = (roles ?? []).map((r) => r.role);
      setCanManage(list.includes("admin") || list.includes("lead"));
      setIsAdmin(list.includes("admin"));
      load();
    })();
  }, [user.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("resources").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      url: form.url.trim(),
      category: form.category.trim() || null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setForm({ title: "", description: "", url: "", category: "" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this resource?")) return;
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) return alert(error.message);
    setItems((x) => x.filter((r) => r.id !== id));
  }

  const categories = Array.from(
    new Set(items.map((r) => r.category).filter((x): x is string => !!x)),
  );
  const visible = filter === "all" ? items : items.filter((r) => r.category === filter);

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Library · Technical resources /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Resources</h1>
      </div>

      {canManage && (
        <form
          onSubmit={submit}
          className="hud-panel corner-brackets grid gap-3 p-5 md:grid-cols-2"
        >
          <p className="mono md:col-span-2 text-[10px] uppercase tracking-widest text-command">
            / Add resource /
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
            className="hud-input md:col-span-2"
            placeholder="URL (link to doc, PDF, video…)"
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            required
          />
          <input
            className="hud-input"
            placeholder="Category (e.g. Flight, Firmware)"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            maxLength={40}
          />
          <input
            className="hud-input"
            placeholder="Short description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            maxLength={300}
          />
          <button
            disabled={busy}
            className="mono md:col-span-2 rounded border border-command/40 bg-command/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-command hover:bg-command/20 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add resource"}
          </button>
        </form>
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {["all", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`mono rounded border px-2 py-1 text-[10px] uppercase tracking-widest ${
                filter === c
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="hud-panel p-6 text-center">
          <p className="mono text-xs text-muted-foreground">
            No resources yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((r) => (
            <li
              key={r.id}
              className="hud-panel corner-brackets flex items-start justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {r.title} ↗
                  </a>
                  {r.category && (
                    <span className="mono rounded border border-command/40 bg-command/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-command">
                      {r.category}
                    </span>
                  )}
                </div>
                {r.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.description}
                  </p>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => remove(r.id)}
                  className="mono rounded border border-destructive/40 px-2 py-1 text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/10"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
