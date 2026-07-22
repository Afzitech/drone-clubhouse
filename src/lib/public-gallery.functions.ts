import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicGalleryItem = {
  id: string;
  title: string;
  caption: string | null;
  image_url: string;
};

export const getPublicGallery = createServerFn({ method: "GET" }).handler(
  async () => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (
            (key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) &&
            h.get("Authorization") === `Bearer ${key}`
          ) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data } = await supabase
      .from("gallery_items")
      .select("id,title,caption,image_url")
      .order("created_at", { ascending: false })
      .limit(12);
    return (data ?? []) as PublicGalleryItem[];
  },
);
