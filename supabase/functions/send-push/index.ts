import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import webpush from "https://esm.sh/web-push@3.6.6";

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(
  "mailto:admin@aeroforge.club",
  vapidPublicKey,
  vapidPrivateKey
);

serve(async (req) => {
  try {
    const payload = await req.json();
    const { record, is_admin_broadcast, title, body } = payload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let targetUserIds: string[] = [];

    if (is_admin_broadcast) {
      // 1. Fetch all user IDs who have the 'admin' role
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        targetUserIds = admins.map((a: any) => a.user_id);
      }
    } else if (record && record.user_id) {
      targetUserIds = [record.user_id];
    }

    if (targetUserIds.length === 0) {
      return new Response("No target users found", { status: 200 });
    }

    // 2. Get push subscriptions for all target users
    const { data: subData, error } = await (supabase as any)
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", targetUserIds);

    if (error || !subData || subData.length === 0) {
      return new Response("No push subscriptions found for target users", { status: 200 });
    }

    // 3. Construct push message
    let pushPayload = "You have a new notification!";
    if (title) {
      pushPayload = `${title} — ${body || ""}`;
    } else if (record && record.title) {
      pushPayload = `${record.title} — ${record.body || ""}`;
    }

    // 4. Send push notification to all matched device subscriptions
    await Promise.all(
      subData.map((subRow: any) =>
        webpush.sendNotification(subRow.subscription, pushPayload).catch((e: any) => {
          console.error("Failed sending push to a device:", e);
        })
      )
    );

    return new Response(JSON.stringify({ success: true, notified: subData.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Push Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
