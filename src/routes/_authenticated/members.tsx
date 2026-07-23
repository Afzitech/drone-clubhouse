import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/members")({
  component: MembersPage,
});

type Member = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: string[];
};

function MembersPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,display_name,avatar_url"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      const list = (profiles ?? []).map((p) => ({
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        roles: roleMap.get(p.id) ?? [],
      }));
      setMembers(list);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Roster · Squadron /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Members</h1>
      </div>
      {loading ? (
        <p className="mono text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {members.map((m) => {
            const initials = (m.display_name ?? "?")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((s) => s[0]?.toUpperCase() ?? "")
              .join("");
            return (
              <div
                key={m.id}
                className="hud-panel corner-brackets flex items-center gap-3 p-4"
              >
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="mono flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                    {initials || "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {m.display_name ?? "Unnamed member"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.roles.length === 0 && (
                      <span className="mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        member
                      </span>
                    )}
                    {m.roles.map((r) => (
                      <span
                        key={r}
                        className={`mono rounded px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${
                          r === "admin"
                            ? "bg-command/20 text-command"
                            : r === "lead"
                              ? "bg-warning/20 text-warning"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r === "lead" ? "pilot" : r}
                      </span>
                    ))}
                  </div>
                  {m.id !== user.id ? (
                    <button
                      onClick={() =>
                        navigate({ to: "/messages", search: { to: m.id } })
                      }
                      className="mono mt-2 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-widest text-primary transition hover:bg-primary/20"
                    >
                      ✉ Message
                    </button>
                  ) : (
                    <p className="mono mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      that's you
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
