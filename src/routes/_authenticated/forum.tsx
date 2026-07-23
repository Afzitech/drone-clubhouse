import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/forum")({
  component: ForumPage,
});

type Thread = {
  id: string;
  title: string;
  category: string;
  body: string | null;
  author_id: string;
  created_at: string;
};

type Post = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type ProfileMap = Record<string, { display_name: string | null }>;

function ForumPage() {
  const { user } = Route.useRouteContext();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setIsAdmin((data ?? []).some((r) => r.role === "admin"));
      });
  }, [user.id]);

  async function deleteThread(id: string) {
    if (!confirm("Delete this thread and all its replies?")) return;
    const { error } = await supabase.from("forum_threads").delete().eq("id", id);
    if (error) return alert(error.message);
    if (selected === id) setSelected(null);
    loadThreads();
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this reply?")) return;
    const { error } = await supabase.from("forum_posts").delete().eq("id", id);
    if (error) return alert(error.message);
    if (selected) loadPosts(selected);
  }
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [reply, setReply] = useState("");

  async function loadThreads() {
    const { data } = await supabase
      .from("forum_threads")
      .select("id,title,category,body,author_id,created_at")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Thread[];
    setThreads(list);
    const ids = Array.from(new Set(list.map((t) => t.author_id)));
    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", ids);
      const map: ProfileMap = {};
      (p ?? []).forEach((row) => {
        map[row.id] = { display_name: row.display_name };
      });
      setProfiles((prev) => ({ ...prev, ...map }));
    }
  }

  async function loadPosts(threadId: string) {
    const { data } = await supabase
      .from("forum_posts")
      .select("id,thread_id,author_id,body,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as Post[];
    setPosts(list);
    const ids = Array.from(new Set(list.map((p) => p.author_id)));
    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", ids);
      const map: ProfileMap = {};
      (p ?? []).forEach((row) => {
        map[row.id] = { display_name: row.display_name };
      });
      setProfiles((prev) => ({ ...prev, ...map }));
    }
  }

  useEffect(() => {
    loadThreads();
  }, []);
  useEffect(() => {
    if (selected) {
      loadPosts(selected);
      // Mark as read
      supabase
        .from("forum_reads")
        .upsert(
          { user_id: user.id, thread_id: selected, last_read_at: new Date().toISOString() },
          { onConflict: "user_id,thread_id" },
        )
        .then(() => {});
    }
  }, [selected, user.id]);

  async function createThread(e: React.FormEvent) {
    e.preventDefault();
    if (newTitle.trim().length < 3) return;
    const { error } = await supabase.from("forum_threads").insert({
      author_id: user.id,
      title: newTitle.trim(),
      body: newBody.trim() || null,
      category: "general",
    });
    if (error) return alert(error.message);
    setNewTitle("");
    setNewBody("");
    loadThreads();
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || reply.trim().length === 0) return;
    const { error } = await supabase.from("forum_posts").insert({
      thread_id: selected,
      author_id: user.id,
      body: reply.trim(),
    });
    if (error) return alert(error.message);
    setReply("");
    loadPosts(selected);
  }

  const activeThread = threads.find((t) => t.id === selected);

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Flight deck · Squadron comms /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Forum</h1>
      </div>

      {!selected ? (
        <>
          <form
            onSubmit={createThread}
            className="hud-panel corner-brackets space-y-3 p-5"
          >
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              / New thread /
            </p>
            <input
              className="hud-input"
              placeholder="Thread title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={140}
            />
            <textarea
              className="hud-input min-h-20"
              placeholder="Opening message (optional)"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              maxLength={2000}
            />
            <button
              type="submit"
              className="mono rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/20"
            >
              Open thread
            </button>
          </form>

          {threads.length === 0 ? (
            <div className="hud-panel p-6 text-center">
              <p className="mono text-xs text-muted-foreground">
                No threads yet. Open the first one.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {threads.map((t) => (
                <li
                  key={t.id}
                  className="hud-panel corner-brackets flex items-start justify-between gap-3 p-4 transition hover:border-primary/50"
                >
                  <button
                    onClick={() => setSelected(t.id)}
                    className="flex-1 text-left"
                  >
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="mono mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {profiles[t.author_id]?.display_name ?? "member"} ·{" "}
                      {new Date(t.created_at).toLocaleString()}
                    </p>
                  </button>
                  {(isAdmin || t.author_id === user.id) && (
                    <button
                      onClick={() => deleteThread(t.id)}
                      className="mono rounded-md border border-destructive/40 px-2 py-1 text-[10px] uppercase tracking-widest text-destructive transition hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setSelected(null)}
            className="mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            ← Back to threads
          </button>
          {activeThread && (
            <div className="hud-panel corner-brackets p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {activeThread.title}
                  </h2>
                  <p className="mono mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {profiles[activeThread.author_id]?.display_name ?? "member"} ·{" "}
                    {new Date(activeThread.created_at).toLocaleString()}
                  </p>
                </div>
                {(isAdmin || activeThread.author_id === user.id) && (
                  <button
                    onClick={() => deleteThread(activeThread.id)}
                    className="mono rounded-md border border-destructive/40 px-2 py-1 text-[10px] uppercase tracking-widest text-destructive transition hover:bg-destructive/10"
                  >
                    Delete thread
                  </button>
                )}
              </div>
              {activeThread.body && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                  {activeThread.body}
                </p>
              )}
            </div>
          )}
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id} className="hud-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="mono text-[11px] uppercase tracking-widest text-primary">
                    {profiles[p.author_id]?.display_name ?? "member"} ·{" "}
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                  {(isAdmin || p.author_id === user.id) && (
                    <button
                      onClick={() => deletePost(p.id)}
                      className="mono text-[10px] uppercase tracking-widest text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
          <form onSubmit={sendReply} className="hud-panel space-y-3 p-4">
            <textarea
              className="hud-input min-h-20"
              placeholder="Write a reply…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={2000}
            />
            <button
              type="submit"
              className="mono rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/20"
            >
              Transmit reply
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
