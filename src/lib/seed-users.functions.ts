import { createServerFn } from "@tanstack/react-start";

// One-time seed to create the initial admin + first member account.
// Safe to call multiple times: it skips users that already exist.
export const seedInitialUsers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const targets = [
    { email: "afzal.7.rahman@gmail.com", password: "AeroForge#Admin2026!Sky", role: "admin" as const },
    { email: "creatorking68@gmail.com", password: "AeroForge#Member2026!Fly", role: "member" as const },
  ];

  const results: Array<{ email: string; status: string }> = [];

  for (const t of targets) {
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users.find((u) => u.email?.toLowerCase() === t.email.toLowerCase());

    let userId = found?.id;
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
    }

    if (userId) {
      // Ensure correct role (trigger already assigns based on email, but be explicit)
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: t.role }, { onConflict: "user_id,role" });
      results.push({ email: t.email, status: found ? "existed" : "created" });
    }
  }

  return { results };
});
