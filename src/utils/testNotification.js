/**
 * Test Notification Utility
 * For testing notifications during development
 */

import notificationService from "../services/notificationService";

export const testNotifications = async () => {
  console.log("🧪 Testing notifications...");

  // Check if notifications are supported
  const settings = notificationService.getSettings();
  console.log("📱 Notification settings:", settings);

  if (!settings.supported) {
    console.warn("❌ Notifications not supported in this browser");
    return false;
  }

  // Request permission if needed
  const hasPermission = await notificationService.requestPermission();
  if (!hasPermission) {
    console.warn("❌ Notification permission denied");
    return false;
  }

  console.log("✅ Notification permission granted");

  // Test different types of notifications
  setTimeout(() => {
    console.log("📨 Testing message notification...");
    notificationService.showMessageNotification(
      "Test User",
      "This is a test message notification!",
      "test-chat-id"
    );
  }, 1000);

  setTimeout(() => {
    console.log("📞 Testing call notification...");
    notificationService.showCallNotification("Test Caller", "voice");
  }, 3000);

  setTimeout(() => {
    console.log("🔔 Testing system notification...");
    notificationService.showSystemNotification(
      "System Test",
      "This is a test system notification!",
      "test"
    );
  }, 5000);

  return true;
};

// Auto-test function for development
export const autoTestNotifications = () => {
  // Only run in development and when app is loaded
  if (import.meta.env.DEV && typeof window !== "undefined") {
    // Wait for app to be fully loaded
    setTimeout(() => {
      console.log("🧪 Auto-testing notifications in development...");
      testNotifications();
    }, 2000);
  }
};
