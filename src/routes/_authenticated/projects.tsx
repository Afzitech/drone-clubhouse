import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { notifyUsers } from "@/lib/notifications.functions";
import { StatusPill } from "./submit";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: "planning" | "in_progress" | "testing" | "completed" | "archived";
  lead_user_id: string | null;
  created_at: string;
  project_members?: { user_id: string }[];
};

type Update = {
  id: string;
  project_id: string;
  author_id: string;
  body: string;
  file_url: string | null;
  file_name: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  project_members?: { user_id: string }[];
};

function ProjectsPage() {
  const { user } = Route.useRouteContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [leadNames, setLeadNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLead, setIsLead] = useState(false);
  const [crewModalOpen, setCrewModalOpen] = useState<string | null>(null);
  const [selectedRecruit, setSelectedRecruit] = useState<string>("");
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (crewModalOpen && allProfiles.length === 0) {
      supabase.from('profiles').select('id, display_name').then(({data}) => {
        if (data) setAllProfiles(data);
      });
    }
  }, [crewModalOpen]);
  const [openId, setOpenId] = useState<string | null>(null);

    useEffect(() => {
    const fetchProjects = async () => {
      const [{ data }, { data: roles }] = await Promise.all([
        supabase
          .from("projects")
          .select("id,title,description,status,lead_user_id,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const list = (data ?? []) as unknown as Project[];
      setProjects(list);

      const leadIds = Array.from(new Set(list.map((p) => p.lead_user_id))).filter(Boolean) as string[];
      if (leadIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,display_name")
          .in("id", leadIds);
        const map: Record<string, string> = {};
        for (const p of profs ?? []) map[p.id] = p.display_name ?? "Member";
        setLeadNames(map);
      }

      const rolesList = (roles ?? []).map((r) => r.role);
      setIsAdmin(rolesList.includes("admin"));
      setIsLead(rolesList.includes("lead"));
      setLoading(false);
    };

    fetchProjects();

    const rtChannel = supabase
      .channel("member-projects-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => fetchProjects())
      .subscribe();

    return () => {
      supabase.removeChannel(rtChannel);
    };
  }, [user.id]);

  async function updateStatus(id: string, status: Project["status"]) {
    const { error } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", id);
    if (error) return alert(error.message);
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  async function deleteProject(id: string) {
    if (
      !confirm(
        "Delete this project? All its updates will be permanently removed.",
      )
    )
      return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return alert(error.message);
    setProjects((p) => p.filter((x) => x.id !== id));
    if (openId === id) setOpenId(null);
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-widest text-primary uppercase mono">
          / ACTIVE PROJECTS
        </h1>
        <p className="text-muted-foreground mt-2 text-xs tracking-widest uppercase mono">
          AEROFORGE SQUADRON R&D FLIGHT DECK
        </p>
      </div>

      {loading ? (
        <p className="mono text-xs text-muted-foreground">Loading...</p>
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
              {p.lead_user_id && leadNames[p.lead_user_id] && (
                <p className="mono mt-3 text-[10px] uppercase tracking-widest text-warning">
                  ... Lead  /  {leadNames[p.lead_user_id]}
                </p>
              )}
              {isAdmin && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["planning", "in_progress", "testing", "completed", "archived"] as const).map(
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
                  <button
                    onClick={() => deleteProject(p.id)}
                    className="mono rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] uppercase tracking-widest text-destructive transition hover:bg-destructive/20"
                  >
                    Delete project
                  </button>
                  <button onClick={() => setCrewModalOpen(p.id)} className="mono rounded border border-command/40 bg-command/10 px-2 py-1 text-[10px] uppercase tracking-widest text-command transition hover:bg-command/20">Manage Crew</button>
                </div>
              )}
              <button
                onClick={() => setOpenId(openId === p.id ? null : p.id)}
                className="mono mt-4 text-[10px] uppercase tracking-widest text-primary hover:underline"
              >
                {openId === p.id ? "Hide updates " : "Show updates "}
              </button>
              {openId === p.id && (
                <ProjectUpdatesPanel
                  project={p}
                  userId={user.id}
                  isAdmin={isAdmin}
                  isReviewer={isAdmin || isLead}
                  canPost={isAdmin || p.lead_user_id === user.id}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>

          {crewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="hud-panel corner-brackets w-full max-w-md p-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="mono text-xs font-bold uppercase tracking-widest text-primary">/ Roster Assignment /</h3>
              <button onClick={() => setCrewModalOpen(null)} className="text-muted-foreground hover:text-destructive transition-colors">âœ•</button>
            </div>
            <div className="mt-5 space-y-4">
              <p className="mono text-[10px] text-muted-foreground uppercase tracking-widest">Select personnel from databanks:</p>
              <select 
                value={selectedRecruit}
                onChange={(e) => setSelectedRecruit(e.target.value)}
                className="mono w-full rounded border border-command/30 bg-background px-3 py-2 text-[11px] text-foreground focus:border-command focus:outline-none"
              >
                <option value="" disabled>Awaiting selection...</option>
                {allProfiles.map(prof => (
                  <option key={prof.id} value={prof.id}>{prof.display_name || "Unknown Member"}</option>
                ))}
              </select>
              <button 
                onClick={async () => {
                  if (!selectedRecruit) return;
                  await supabase.from('project_members').insert({ project_id: crewModalOpen, user_id: selectedRecruit });
                  setCrewModalOpen(null);
                  window.location.reload();
                }}
                className="mono w-full rounded bg-command/20 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-command hover:bg-command/30 transition-all"
              >
                Deploy to Project
              </button>
            </div>
          </div>
        </div>
      )}

  );
}

function ProjectUpdatesPanel({
  project,
  userId,
  isReviewer,
  canPost,
}: {
  project: Project;
  userId: string;
  isAdmin: boolean;
  isReviewer: boolean;
  canPost: boolean;
}) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const notify = useServerFn(notifyUsers);

  async function load() {
    const { data } = await supabase
      .from("project_updates")
      .select(
        "id,project_id,author_id,body,file_url,file_name,status,admin_note,created_at",
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Update[];
    setUpdates(list);
    const ids = Array.from(new Set(list.map((u) => u.author_id)));
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
    load();
    const rtChannel = supabase
      .channel(`project-updates-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_updates" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(rtChannel);
    };
  }, [project.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    let file_url: string | null = null;
    let file_name: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("project-files")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setBusy(false);
        return alert(upErr.message);
      }
      const { data: pub } = supabase.storage
        .from("project-files")
        .getPublicUrl(path);
      file_url = pub.publicUrl;
      file_name = file.name;
    }
    const { error } = await supabase.from("project_updates").insert({
      project_id: project.id,
      author_id: userId,
      body: body.trim(),
      file_url,
      file_name,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setBody("");
    setFile(null);
    load();
    // Notify admins that a new update needs approval
    try {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = (admins ?? [])
        .map((a) => a.user_id)
        .filter((id) => id !== userId);
      if (adminIds.length) {
        await notify({
          data: {
            userIds: adminIds,
            type: "update-review-request",
            title: `Update pending review  /  ${project.title}`,
            body: body.trim().slice(0, 200),
            link: "/admin",
          },
        });
      }
    } catch (err) {
      console.error("notify admins failed", err);
    }
  }

  async function review(u: Update, status: "approved" | "rejected") {
    const { error } = await supabase
      .from("project_updates")
      .update({
        status,
        admin_note: notes[u.id] ?? null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", u.id);
    if (error) return alert(error.message);
    try {
      const res = await notify({
        data: {
          userIds: [u.author_id],
          type: "update-review",
          title: `Update ${status}  /  ${project.title}`,
          body: notes[u.id] ?? undefined,
          link: "/projects",
        },
      });
      console.log("[notify]", res);
    } catch (err) {
      console.error("notify author failed", err);
    }
    load();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
      {canPost ? (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            className="hud-input min-h-[70px]"
            placeholder="Post an update"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={1500}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mono text-[10px] text-muted-foreground"
            />
            <button
              disabled={busy}
              className="mono rounded border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              {busy ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Only the project lead and admins can post updates.
        </p>
      )}

      {updates.length === 0 ? (
        <p className="mono text-[11px] text-muted-foreground">No updates yet.</p>
      ) : (
        <ul className="space-y-2">
          {updates.map((u) => (
            <li key={u.id} className="rounded border border-border/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {names[u.author_id] ?? "member"}  / {" "}
                    {new Date(u.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {u.body}
                  </p>
                  {u.file_url && (
                    <a
                      href={u.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mono mt-1 inline-block text-[10px] text-primary hover:underline"
                    >
                       {u.file_name ?? "file"}  - 
                    </a>
                  )}
                  {u.admin_note && (
                    <p className="mono mt-1 text-[10px] text-command">
                      Note: {u.admin_note}
                    </p>
                  )}
                </div>
                <StatusPill status={u.status} />
              </div>
              {isReviewer && u.status === "pending" && (
                <div className="mt-2 space-y-2">
                  <input
                    className="hud-input text-xs"
                    placeholder="Optional note"
                    value={notes[u.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [u.id]: e.target.value }))
                    }
                    maxLength={300}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(u, "approved")}
                      className="mono rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(u, "rejected")}
                      className="mono rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/20"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
</div>
  );
}



// HUD Header Synchronized: 1785488313403
