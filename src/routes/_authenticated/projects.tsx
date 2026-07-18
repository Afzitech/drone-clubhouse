import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusPill } from "./submit";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: "planning" | "active" | "complete" | "archived";
  lead_user_id: string | null;
  created_at: string;
};

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: userData }] = await Promise.all([
        supabase
          .from("projects")
          .select("id,title,description,status,lead_user_id,created_at")
          .order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);
      setProjects((data ?? []) as Project[]);
      if (userData.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id);
        setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
      }
      setLoading(false);
    })();
  }, []);

  async function updateStatus(id: string, status: Project["status"]) {
    const { error } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", id);
    if (error) return alert(error.message);
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Flight deck · Active projects /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Projects</h1>
      </div>

      {loading ? (
        <p className="mono text-xs text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="hud-panel corner-brackets p-8 text-center">
          <p className="mono text-xs text-muted-foreground">
            No approved projects on the board yet.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id} className="hud-panel corner-brackets p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {p.title}
                </h3>
                <StatusPill status={p.status} />
              </div>
              {p.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.description}
                </p>
              )}
              {isAdmin && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["planning", "active", "complete", "archived"] as const).map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(p.id, s)}
                        disabled={p.status === s}
                        className="mono rounded border border-command/40 bg-command/10 px-2 py-1 text-[10px] uppercase tracking-widest text-command transition hover:bg-command/20 disabled:opacity-30"
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
