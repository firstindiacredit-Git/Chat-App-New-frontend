// Debug Real-time Messaging
console.log("🔍 Debugging Real-time Messaging...");

// Check if socket is connected
function checkSocketConnection() {
  const socket = window.socket || window.io?.socket;
  if (socket) {
    console.log("✅ Socket found:", socket.id);
    console.log("✅ Socket connected:", socket.connected);
    console.log("✅ Socket URL:", socket.io?.uri);
  } else {
    console.log("❌ Socket not found");
  }
}

// Check message events
function checkMessageEvents() {
  const socket = window.socket || window.io?.socket;
  if (socket) {
    console.log("📨 Checking message events...");

    // Listen for new messages
    socket.on("new-message", (data) => {
      console.log("📨 New message received:", data);
    });

    // Listen for message sent
    socket.on("message-sent", (data) => {
      console.log("📤 Message sent confirmation:", data);
    });

    // Listen for message errors
    socket.on("message-error", (error) => {
      console.log("❌ Message error:", error);
    });

    console.log("✅ Message event listeners attached");
  }
}

// Test message sending
function testMessageSending() {
  const socket = window.socket || window.io?.socket;
  if (socket && socket.connected) {
    console.log("📤 Testing message sending...");

    socket.emit("send-message", {
      receiverId: "test-receiver-id",
      content: "Test message from debug script",
      messageType: "text",
      isGroupChat: false,
    });

    console.log("✅ Test message sent");
  } else {
    console.log("❌ Cannot send test message - socket not connected");
  }
}

// Run all checks
function runDebugChecks() {
  console.log("🔍 Running debug checks...");
  checkSocketConnection();
  checkMessageEvents();

  setTimeout(() => {
    testMessageSending();
  }, 2000);
}

// Export functions for console use
window.debugRealtime = {
  checkSocketConnection,
  checkMessageEvents,
  testMessageSending,
  runDebugChecks,
};

console.log("🔧 Debug functions available:");
console.log("- debugRealtime.checkSocketConnection()");
console.log("- debugRealtime.checkMessageEvents()");
console.log("- debugRealtime.testMessageSending()");
console.log("- debugRealtime.runDebugChecks()");

// Auto-run checks
runDebugChecks();
