import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", (context as { user: { id: string } }).user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: () => (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-command">
          / Command · Admin console /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Command Center</h1>
      </div>
      <div className="hud-panel command-glow corner-brackets p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Admin modules — submissions queue, member management, invites, project
          administration — coming online in the next build phase.
        </p>
      </div>
    </div>
  ),
});
