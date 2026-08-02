import { supabase } from "@/integrations/supabase/client";

// Utility to convert VAPID public key string to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerAndSubscribePush(vapidPublicKey: string, userId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push messaging is not supported by this browser/device.");
    return null;
  }

  try {
    // 1. Register the Service Worker
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // 2. Request Android/Browser Push Subscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // 3. Save subscription to Supabase (using `as any` to bypass strict table typings)
    const { error } = await (supabase as any)
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          subscription: JSON.parse(JSON.stringify(subscription)),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Failed to save push subscription to Supabase:", error.message);
    } else {
      console.log("Push notification subscription synced successfully!");
    }

    return subscription;
  } catch (err) {
    console.error("Push registration failed:", err);
    return null;
  }
}
