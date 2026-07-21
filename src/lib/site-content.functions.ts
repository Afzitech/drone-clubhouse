import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LandingContent = {
  hero_eyebrow: string;
  hero_title: string;
  hero_accent: string;
  hero_subtitle: string;
  about_title: string;
  about_body: string;
  mission_title: string;
  mission_body: string;
};

const DEFAULTS: LandingContent = {
  hero_eyebrow: "Restricted airspace · Members only",
  hero_title: "Aeroforge",
  hero_accent: "forge the sky.",
  hero_subtitle:
    "A private hangar for our drone club — coordinate builds, track live project status, and log flight ops in one place.",
  about_title: "About Aeroforge",
  about_body:
    "Aeroforge is the operations hub for our drone & robotics club.",
  mission_title: "Our Mission",
  mission_body:
    "To design, build, and fly next-generation UAVs.",
};

export const getLandingContent = createServerFn({ method: "GET" }).handler(
  async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (
            key.startsWith("sb_") &&
            h.get("Authorization") === `Bearer ${key}`
          ) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data } = await client
      .from("site_content")
      .select("data")
      .eq("id", "landing")
      .maybeSingle();
    return { ...DEFAULTS, ...((data?.data ?? {}) as Partial<LandingContent>) };
  },
);

const landingSchema = z.object({
  hero_eyebrow: z.string().trim().max(120),
  hero_title: z.string().trim().min(1).max(80),
  hero_accent: z.string().trim().max(80),
  hero_subtitle: z.string().trim().max(500),
  about_title: z.string().trim().min(1).max(120),
  about_body: z.string().trim().max(2000),
  mission_title: z.string().trim().min(1).max(120),
  mission_body: z.string().trim().max(2000),
});

export const updateLandingContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => landingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await context.supabase
      .from("site_content")
      .upsert({ id: "landing", data, updated_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
