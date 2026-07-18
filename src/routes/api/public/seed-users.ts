import { createFileRoute } from "@tanstack/react-router";

// One-shot seed endpoint. Delete after use.
export const Route = createFileRoute("/api/public/seed-users")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const targets = [
          { email: "afzal.7.rahman@gmail.com", password: "AeroForge#Admin2026!Sky", role: "admin" },
          { email: "creatorking68@gmail.com", password: "AeroForge#Member2026!Fly", role: "member" },
        ] as const;

        const results: Array<{ email: string; status: string }> = [];
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();

        for (const t of targets) {
          const found = list?.users.find((u) => u.email?.toLowerCase() === t.email);
          let userId = found?.id;
          let status = "existed";
          if (!userId) {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              email: t.email,
              password: t.password,
              email_confirm: true,
            });
            if (error) {
              results.push({ email: t.email, status: `error: ${error.message}` });
              continue;
            }
            userId = data.user?.id;
            status = "created";
          } else {
            // reset password so we know it
            await supabaseAdmin.auth.admin.updateUserById(userId, { password: t.password });
            status = "existed (password reset)";
          }
          if (userId) {
            await supabaseAdmin
              .from("user_roles")
              .upsert({ user_id: userId, role: t.role }, { onConflict: "user_id,role" });
          }
          results.push({ email: t.email, status });
        }

        return new Response(JSON.stringify({ results }, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
