import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const notifySchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  type: z.string().min(1).max(60),
  title: z.string().min(1).max(140),
  body: z.string().max(500).optional(),
  link: z.string().max(300).optional(),
});

/** Broadcast a notification. Only admins/leads may call. */
export const notifyUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => notifySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isPrivileged = (roles ?? []).some(
      (r) => r.role === "admin" || r.role === "lead",
    );
    if (!isPrivileged) throw new Error("Forbidden");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const rows = data.userIds.map((uid) => ({
      user_id: uid,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      link: data.link ?? null,
    }));
    const { error } = await supabaseAdmin.from("notifications").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

/** Broadcast to every member. */
export const notifyAllMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        type: z.string().min(1).max(60),
        title: z.string().min(1).max(140),
        body: z.string().max(500).optional(),
        link: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isPrivileged = (roles ?? []).some(
      (r) => r.role === "admin" || r.role === "lead",
    );
    if (!isPrivileged) throw new Error("Forbidden");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id");
    if (pErr) throw new Error(pErr.message);
    const rows = (profiles ?? [])
      .filter((p) => p.id !== context.userId)
      .map((p) => ({
        user_id: p.id,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        link: data.link ?? null,
      }));
    if (rows.length === 0) return { ok: true, count: 0 };
    const { error } = await supabaseAdmin.from("notifications").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });
