import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { notifyAllMembers } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/announcements")({
  component: AnnouncementsPage,
});

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_by: string;
  created_at: string;
};

function AnnouncementsPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Announcement[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [canPost, setCanPost] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const notify = useServerFn(notifyAllMembers);

  async function load() {
    const { data } = await supabase
      .from("announcements")
      .select("id,title,body,pinned,created_by,created_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Announcement[];
    setItems(list);
    const ids = Array.from(new Set(list.map((a) => a.created_by)));
    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", ids);
      const map: Record<string, string> = {};
      (p ?? []).forEach((r) => {
        if (r.display_name) map[r.id] = r.display_name;
      });
      setNames(map);
    }
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

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim(),
      pinned,
      created_by: user.id,
    });
    if (error) {
      setBusy(false);
      return alert(error.message);
    }
    // Fire notification broadcast (best-effort)
    try {
      await notify({
        data: {
          type: "announcement",
          title: `Announcement: ${title.trim()}`,
          body: body.trim().slice(0, 200),
          link: "/announcements",
        },
      });
    } catch {
      /* ignore */
    }
    setTitle("");
    setBody("");
    setPinned(false);
    setBusy(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return alert(error.message);
    setItems((x) => x.filter((a) => a.id !== id));
  }

  async function togglePin(a: Announcement) {
    const { error } = await supabase
      .from("announcements")
      .update({ pinned: !a.pinned })
      .eq("id", a.id);
    if (error) return alert(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Comms · Announcements /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Announcements</h1>
      </div>

      {canPost && (
        <form
          onSubmit={post}
          className="hud-panel corner-brackets space-y-3 p-5"
        >
          <p className="mono text-[10px] uppercase tracking-widest text-command">
            / Post new announcement /
          </p>
          <input
            className="hud-input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={140}
          />
          <textarea
            className="hud-input min-h-[100px]"
            placeholder="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={2000}
          />
          <label className="mono flex items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            Pin to top
          </label>
          <button
            disabled={busy}
            className="mono rounded border border-command/40 bg-command/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-command hover:bg-command/20 disabled:opacity-50"
          >
            {busy ? "Broadcasting…" : "Post & notify all"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="hud-panel p-6 text-center">
          <p className="mono text-xs text-muted-foreground">
            No announcements yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li
              key={a.id}
              className={`hud-panel corner-brackets p-5 ${a.pinned ? "border-warning/50" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {a.pinned && (
                    <span className="mono mr-2 rounded border border-warning/50 bg-warning/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-warning">
                      ★ Pinned
                    </span>
                  )}
                  <h3 className="inline text-lg font-semibold text-foreground">
                    {a.title}
                  </h3>
                  <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {names[a.created_by] ?? "member"} ·{" "}
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                {(isAdmin || canPost) && (
                  <div className="flex gap-2">
                    {canPost && (
                      <button
                        onClick={() => togglePin(a)}
                        className="mono rounded border border-warning/40 px-2 py-1 text-[10px] uppercase tracking-widest text-warning hover:bg-warning/10"
                      >
                        {a.pinned ? "Unpin" : "Pin"}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => remove(a.id)}
                        className="mono rounded border border-destructive/40 px-2 py-1 text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/10"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
                {a.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
