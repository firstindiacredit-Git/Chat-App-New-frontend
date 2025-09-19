/**
 * Service Worker Registration Utility
 * Registers and manages the service worker for notifications
 */

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config) {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swUrl = "/sw.js";

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log("Service worker is ready for localhost");
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log("Service Worker registered successfully:", registration);

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("Message from service worker:", event.data);

        switch (event.data.type) {
          case "NAVIGATE_TO_CHAT":
            // Navigate to specific chat
            const navigateEvent = new CustomEvent("navigateToChat", {
              detail: { chatId: event.data.chatId },
            });
            window.dispatchEvent(navigateEvent);
            break;

          case "INCOMING_CALL":
            // Handle incoming call
            const callEvent = new CustomEvent("incomingCall", {
              detail: {
                callerName: event.data.callerName,
                callType: event.data.callType,
              },
            });
            window.dispatchEvent(callEvent);
            break;

          case "ANSWER_CALL":
            // Handle call answer
            const answerEvent = new CustomEvent("answerCall");
            window.dispatchEvent(answerEvent);
            break;

          case "DECLINE_CALL":
            // Handle call decline
            const declineEvent = new CustomEvent("declineCall");
            window.dispatchEvent(declineEvent);
            break;
        }
      });

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              console.log("New content is available; please refresh.");
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log("Content is cached for offline use.");
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error("Error during service worker registration:", error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl)
    .then((response) => {
      const contentType = response.headers.get("content-type");
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf("javascript") === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        "No internet connection found. App is running in offline mode."
      );
    });
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
