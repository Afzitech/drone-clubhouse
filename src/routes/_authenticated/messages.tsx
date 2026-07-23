import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: z.object({ to: z.string().uuid().optional() }),
  component: MessagesPage,
});

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function MessagesPage() {
  const { user } = Route.useRouteContext();
  const { to } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<string | null>(to ?? null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (to && to !== active) setActive(to);
  }, [to]);

  async function loadAll() {
    const { data } = await supabase
      .from("direct_messages")
      .select("id,sender_id,recipient_id,body,read_at,created_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as Message[];
    setMessages(list);
    const ids = new Set<string>();
    list.forEach((m) => {
      ids.add(m.sender_id);
      ids.add(m.recipient_id);
    });
    if (active) ids.add(active);
    if (ids.size) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", Array.from(ids));
      const map: Record<string, ProfileRow> = {};
      (p ?? []).forEach((r) => (map[r.id] = r));
      setProfiles(map);
    }
  }

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel(`dm-page:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => loadAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user.id, active]);

  // Conversations grouped
  const conversations = useMemo(() => {
    const map = new Map<string, { last: Message; unread: number }>();
    for (const m of messages) {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const prev = map.get(other);
      const unread =
        m.recipient_id === user.id && !m.read_at ? 1 : 0;
      if (!prev) map.set(other, { last: m, unread });
      else {
        prev.unread += unread;
        if (new Date(m.created_at) > new Date(prev.last.created_at))
          prev.last = m;
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort(
        (a, b) =>
          new Date(b.last.created_at).getTime() -
          new Date(a.last.created_at).getTime(),
      );
  }, [messages, user.id]);

  const thread = useMemo(
    () =>
      active
        ? messages.filter(
            (m) =>
              (m.sender_id === user.id && m.recipient_id === active) ||
              (m.sender_id === active && m.recipient_id === user.id),
          )
        : [],
    [messages, active, user.id],
  );

  useEffect(() => {
    if (!active) return;
    // mark thread as read
    const ids = thread
      .filter((m) => m.recipient_id === user.id && !m.read_at)
      .map((m) => m.id);
    if (ids.length) {
      supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids)
        .then(() => {});
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active, thread.length, user.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      recipient_id: active,
      body,
    });
    if (error) alert(error.message);
    loadAll();
  }

  function selectConv(id: string) {
    setActive(id);
    navigate({ search: { to: id }, replace: true });
  }

  const activeProfile = active ? profiles[active] : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Comms · Direct messages /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Messages</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <aside className="hud-panel corner-brackets p-2 h-[70vh] overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="mono p-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              No conversations yet. Open a member's profile in Members.
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((c) => {
                const p = profiles[c.id];
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => selectConv(c.id)}
                      className={`w-full rounded-md border px-2 py-2 text-left transition ${
                        active === c.id
                          ? "border-primary/40 bg-primary/10"
                          : "border-transparent hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {p?.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="mono flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                            {(p?.display_name ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {p?.display_name ?? "member"}
                            </p>
                            {c.unread > 0 && (
                              <span className="mono rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">
                                {c.unread}
                              </span>
                            )}
                          </div>
                          <p className="mono truncate text-[10px] text-muted-foreground">
                            {c.last.body}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
        <section className="hud-panel corner-brackets flex h-[70vh] flex-col">
          {!active ? (
            <div className="m-auto text-center">
              <p className="mono text-xs text-muted-foreground">
                Select a conversation, or open Members to start a new one.
              </p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                {activeProfile?.avatar_url ? (
                  <img
                    src={activeProfile.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="mono flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {(activeProfile?.display_name ?? "?")[0]?.toUpperCase()}
                  </div>
                )}
                <p className="font-semibold text-foreground">
                  {activeProfile?.display_name ?? "member"}
                </p>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {thread.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                          mine
                            ? "bg-primary/20 text-foreground border border-primary/30"
                            : "bg-muted text-foreground border border-border"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className="mono mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form
                onSubmit={send}
                className="flex gap-2 border-t border-border/50 p-3"
              >
                <input
                  className="hud-input flex-1"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                />
                <button className="mono rounded border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/20">
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
