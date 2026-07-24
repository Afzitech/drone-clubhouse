import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [activeProjects, setActiveProjects] = useState<number>(0);
  const [mySubs, setMySubs] = useState<number>(0);
  const [forumUnread, setForumUnread] = useState<number>(0);
  const [dmUnread, setDmUnread] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (alive) setDisplayName(data?.display_name ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [user.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ count: p }, { count: s }, { count: d }] = await Promise.all([
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .in("status", ["planning", "in_progress", "testing"]),
        supabase
          .from("project_submissions")
          .select("id", { count: "exact", head: true })
          .eq("submitter_id", user.id),
        supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null),
      ]);

      const { data: threads } = await supabase
        .from("forum_threads")
        .select("id,created_at");
      const threadIds = (threads ?? []).map((t) => t.id);
      const { data: reads } = await supabase
        .from("forum_reads")
        .select("thread_id,last_read_at")
        .eq("user_id", user.id);
      const readMap = new Map<string, string>(
        (reads ?? []).map((r) => [r.thread_id, r.last_read_at]),
      );
      const { data: lastPosts } =
        threadIds.length > 0
          ? await supabase
              .from("forum_posts")
              .select("thread_id,created_at")
              .in("thread_id", threadIds)
          : { data: [] as { thread_id: string; created_at: string }[] };
      const lastActivity = new Map<string, string>();
      for (const t of threads ?? []) lastActivity.set(t.id, t.created_at);
      for (const p of lastPosts ?? []) {
        const prev = lastActivity.get(p.thread_id);
        if (!prev || new Date(p.created_at) > new Date(prev))
          lastActivity.set(p.thread_id, p.created_at);
      }
      let unread = 0;
      for (const [tid, ts] of lastActivity) {
        const seen = readMap.get(tid);
        if (!seen || new Date(ts) > new Date(seen)) unread++;
      }

      if (!alive) return;
      setActiveProjects(p ?? 0);
      setMySubs(s ?? 0);
      setForumUnread(unread);
      setDmUnread(d ?? 0);
    })();
    return () => {
      alive = false;
    };
  }, [user.id]);

  const name =
    displayName ??
    (user.user_metadata as { display_name?: string } | undefined)?.display_name ??
    user.email?.split("@")[0] ??
    "member";

  const cards = [
    {
      t: "Active projects",
      v: activeProjects,
      to: "/projects",
      label: "View board",
    },
    {
      t: "My submissions",
      v: mySubs,
      to: "/submit",
      label: "New submission",
    },
    {
      t: "Unread forum threads",
      v: forumUnread,
      to: "/forum",
      label: forumUnread > 0 ? "Catch up ->" : "Open forum",
      accent: forumUnread > 0,
    },
    {
      t: "Unread messages",
      v: dmUnread,
      to: "/messages",
      label: dmUnread > 0 ? "Read now ->" : "Open inbox",
      accent: dmUnread > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Aeroforge - Overview /
        </p>
        <h1 className="display-font mt-2 text-4xl font-bold tracking-wide text-foreground sm:text-5xl">
          Welcome back, <span className="neon-text">{name}</span>.
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.t}
            className={`
  hud-panel
  corner-brackets
  group
  relative
  overflow-visible
  p-5
  transition-all
  duration-300
  ease-out
  hover:-translate-y-2
  hover:scale-[1.03]
  hover:border-primary
  hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]
  active:-translate-y-1
  active:scale-[1.02]
  ${c.accent ? "border-primary/60" : ""}
`}
          >

            <div
              className="
                pointer-events-none
                absolute
                left-8
                right-8
                -bottom-4
                h-6
                rounded-full
                bg-blue-500/40
                blur-2xl
                opacity-0
                transition-opacity
                duration-300
                group-hover:opacity-100
                group-active:opacity-100
              "
            />

            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {c.t}
            </p>
            <p
              className={`
mono
mt-2
text-3xl
font-bold
transition-all
duration-300
group-hover:tracking-wider
group-hover:text-cyan-300
${c.accent ? "text-primary hud-glow" : "text-foreground"}
`}
            >
              {c.v}
            </p>
            <Link
              to={c.to}
              className="mono mt-4 inline-block text-[10px] uppercase tracking-widest text-primary hover:underline"
            >
              {c.label}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
