self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.text() : "You have a new notification!";
  
  const options = {
    body: payload,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: { url: "/notifications" },
    tag: "aeroforge-alert",
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification("Aeroforge", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/notifications") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || "/notifications");
      }
    })
  );
});
