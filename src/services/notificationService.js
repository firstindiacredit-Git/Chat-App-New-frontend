/**
 * Mobile Notification Service
 * Handles native mobile notifications for the chat app
 */

import { API_CONFIG } from '../config/mobileConfig';

class NotificationService {
  constructor() {
    this.isSupported = "Notification" in window;
    this.permission = this.isSupported ? Notification.permission : "denied";
    this.isAppInForeground = true;

    // Track app visibility
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        this.isAppInForeground = !document.hidden;
      });
    }

    // Track window focus
    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => {
        this.isAppInForeground = true;
      });

      window.addEventListener("blur", () => {
        this.isAppInForeground = false;
      });
    }
  }

  /**
   * Request notification permission and setup push subscription
   */
  async requestPermission() {
    if (!this.isSupported) {
      console.warn("Notifications are not supported in this browser");
      return false;
    }

    if (this.permission === "granted") {
      // If permission already granted, setup push subscription
      await this.setupPushSubscription();
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === "granted") {
        // Setup push subscription after permission granted
        await this.setupPushSubscription();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  /**
   * Setup push subscription with backend
   */
  async setupPushSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push messaging is not supported");
      return false;
    }

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from backend
      const response = await fetch(`${this.getApiUrl()}/notifications/vapid-public-key`);
      const data = await response.json();
      
      if (!data.success) {
        console.error("Failed to get VAPID public key:", data.message);
        return false;
      }

      const vapidPublicKey = data.data.publicKey;
      console.log("📱 Got VAPID public key from backend");

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      console.log("📱 Push subscription created:", subscription);

      // Send subscription to backend
      const token = this.getAuthToken();
      if (!token) {
        console.error("No auth token found - cannot subscribe to notifications");
        return false;
      }

      const subscribeResponse = await fetch(`${this.getApiUrl()}/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription: subscription,
        }),
      });

      const subscribeData = await subscribeResponse.json();
      
      if (subscribeData.success) {
        console.log("📱 Successfully subscribed to push notifications");
        return true;
      } else {
        console.error("Failed to subscribe to push notifications:", subscribeData.message);
        return false;
      }

    } catch (error) {
      console.error("Error setting up push subscription:", error);
      return false;
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get API URL
   */
  getApiUrl() {
    return API_CONFIG.API_URL;
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    return localStorage.getItem('token') || 
           localStorage.getItem('authToken') || 
           sessionStorage.getItem('token') ||
           sessionStorage.getItem('authToken');
  }

  /**
   * Show notification (only when app is in background)
   */
  showNotification(title, options = {}) {
    // Don't show notifications if app is in foreground
    if (this.isAppInForeground) {
      console.log("App is in foreground, skipping notification");
      return null;
    }

    if (!this.isSupported || this.permission !== "granted") {
      console.warn("Notifications not available or permission denied");
      return null;
    }

    try {
      const defaultOptions = {
        icon: "/vite.svg", // App icon
        badge: "/vite.svg",
        tag: "chat-message", // Prevent duplicate notifications
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200], // Vibration pattern for mobile
        data: {
          timestamp: Date.now(),
          url: window.location.origin,
        },
      };

      const notification = new Notification(title, {
        ...defaultOptions,
        ...options,
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();

        // Focus the app window
        window.focus();

        // Bring app to foreground
        if ("serviceWorker" in navigator) {
          // For PWA apps
          navigator.serviceWorker.ready.then((registration) => {
            if (registration.active) {
              registration.active.postMessage({
                type: "NOTIFICATION_CLICKED",
                data: options.data || {},
              });
            }
          });
        }

        // Handle custom click actions
        if (options.onClick) {
          options.onClick(event);
        }

        // Close notification
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error("Error showing notification:", error);
      return null;
    }
  }

  /**
   * Show message notification
   */
  showMessageNotification(senderName, message, chatId) {
    const title = senderName;
    const options = {
      body: message,
      icon: "/vite.svg",
      tag: `message-${chatId}`, // Group notifications by chat
      data: {
        type: "message",
        chatId: chatId,
        senderName: senderName,
        message: message,
      },
      onClick: () => {
        // Navigate to specific chat
        this.navigateToChat(chatId);
      },
    };

    return this.showNotification(title, options);
  }

  /**
   * Show call notification
   */
  showCallNotification(callerName, callType = "voice") {
    const title = `Incoming ${callType} call`;
    const options = {
      body: `${callerName} is calling you`,
      icon: "/vite.svg",
      tag: "incoming-call",
      requireInteraction: true, // Keep notification until user interacts
      actions: [
        {
          action: "answer",
          title: "Answer",
          icon: "/vite.svg",
        },
        {
          action: "decline",
          title: "Decline",
          icon: "/vite.svg",
        },
      ],
      data: {
        type: "call",
        callerName: callerName,
        callType: callType,
      },
    };

    return this.showNotification(title, options);
  }

  /**
   * Show system notification (blocking, friend request, etc.)
   */
  showSystemNotification(title, message, type = "info") {
    const options = {
      body: message,
      icon: "/vite.svg",
      tag: `system-${type}`,
      data: {
        type: "system",
        category: type,
        message: message,
      },
    };

    return this.showNotification(title, options);
  }

  /**
   * Navigate to specific chat
   */
  navigateToChat(chatId) {
    // This will be handled by the main app
    const event = new CustomEvent("navigateToChat", {
      detail: { chatId },
    });
    window.dispatchEvent(event);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications() {
    // This only works in some browsers
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.getNotifications().then((notifications) => {
          notifications.forEach((notification) => notification.close());
        });
      });
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.isSupported && this.permission === "granted";
  }

  /**
   * Get notification settings
   */
  getSettings() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      enabled: this.isEnabled(),
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
