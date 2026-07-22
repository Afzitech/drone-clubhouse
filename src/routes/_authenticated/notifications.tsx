import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function NotificationsPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Notif[]>([]);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("id,type,title,body,link,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data ?? []) as Notif[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    load();
  }

  async function clearAll() {
    if (!confirm("Delete all notifications?")) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setItems([]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-primary">
            / Comms · Inbox /
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Notifications
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllRead}
            className="mono rounded border border-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Mark all read
          </button>
          <button
            onClick={clearAll}
            className="mono rounded border border-destructive/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/10"
          >
            Clear
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="hud-panel p-6 text-center">
          <p className="mono text-xs text-muted-foreground">
            No notifications.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`hud-panel corner-brackets p-4 ${!n.read_at ? "border-primary/50" : "opacity-75"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read_at && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      {n.title}
                    </p>
                  </div>
                  {n.body && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {n.type} · {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {n.link && (
                  <Link
                    to={n.link}
                    className="mono rounded border border-primary/40 px-2 py-1 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10"
                  >
                    Open
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
