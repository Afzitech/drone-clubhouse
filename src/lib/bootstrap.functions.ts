import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_EMAIL = "afzal.7.rahman@gmail.com";

const bootstrapSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

/**
 * Public one-time endpoint: creates the very first admin account.
 * Rejects once any admin exists, and only accepts the whitelisted admin email.
 */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bootstrapSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.email !== ADMIN_EMAIL) {
      throw new Error("This email is not authorised for admin bootstrap.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("Admin already exists. Ask an admin to create your account.");
    }

    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (createErr) throw new Error(createErr.message);

    return { ok: true };
  });

/** Returns whether the club has been bootstrapped (any admin exists). */
export const bootstrapStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return { hasAdmin: (count ?? 0) > 0 };
});
