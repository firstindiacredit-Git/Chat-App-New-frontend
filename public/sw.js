/**
 * Service Worker for Chat App
 * Handles background notifications and PWA functionality
 */

const CACHE_NAME = "chat-app-v1";
const urlsToCache = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/vite.svg",
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  const notificationData = event.notification.data || {};

  // Handle different types of notifications
  switch (notificationData.type) {
    case "message":
      // Open app and navigate to specific chat
      event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
          // If app is already open, focus it and navigate
          for (let client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.focus();
              client.postMessage({
                type: "NAVIGATE_TO_CHAT",
                chatId: notificationData.chatId,
              });
              return;
            }
          }

          // If app is not open, open it
          clients.openWindow("/").then((client) => {
            if (client) {
              client.postMessage({
                type: "NAVIGATE_TO_CHAT",
                chatId: notificationData.chatId,
              });
            }
          });
        })
      );
      break;

    case "call":
      // Handle call notification
      event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
          for (let client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.focus();
              client.postMessage({
                type: "INCOMING_CALL",
                callerName: notificationData.callerName,
                callType: notificationData.callType,
              });
              return;
            }
          }

          clients.openWindow("/");
        })
      );
      break;

    case "system":
      // Handle system notifications
      event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
          for (let client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.focus();
              return;
            }
          }

          clients.openWindow("/");
        })
      );
      break;

    default:
      // Default action - just open the app
      event.waitUntil(clients.openWindow("/"));
  }
});

// Handle notification actions (for call notifications)
self.addEventListener("notificationclick", (event) => {
  if (event.action === "answer") {
    // Handle answer action
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.postMessage({
              type: "ANSWER_CALL",
            });
            return;
          }
        }

        clients.openWindow("/").then((client) => {
          if (client) {
            client.postMessage({
              type: "ANSWER_CALL",
            });
          }
        });
      })
    );
  } else if (event.action === "decline") {
    // Handle decline action
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.postMessage({
              type: "DECLINE_CALL",
            });
            return;
          }
        }
      })
    );
  }

  event.notification.close();
});

// Handle messages from main app
self.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data);

  if (event.data.type === "NOTIFICATION_CLICKED") {
    // Handle notification click from main app
    const data = event.data.data || {};

    // Send message to all clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "NOTIFICATION_ACTION",
          data: data,
        });
      });
    });
  }
});

// Background sync for offline messages (future feature)
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // Handle background sync
      console.log("Background sync triggered")
    );
  }
});

// Push event for server-sent notifications (future feature)
self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: "/vite.svg",
      badge: "/vite.svg",
      tag: data.tag || "default",
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});
