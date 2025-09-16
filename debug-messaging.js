// Debug Messaging Issues
console.log("🔍 Debugging Messaging Issues...");

function debugSocketConnection() {
  console.log("🔌 Socket Connection Debug:");
  console.log("==================");

  // Check if socket is available globally
  const globalSocket = window.socket || window.io?.socket;
  console.log("🌐 Global socket:", globalSocket ? "Found" : "Not found");

  // Check React context (if available)
  if (window.React && window.React.useContext) {
    console.log("⚛️ React context available");
  }

  // Check localStorage for user data
  const user = JSON.parse(localStorage.getItem("user") || "null");
  console.log("👤 User data:", user);

  // Check token
  const token = localStorage.getItem("token");
  console.log("🔑 Token:", token ? "Exists" : "Not found");

  // Check if we're in a chat context
  const chatElements = document.querySelectorAll(
    '[class*="chat"], [class*="message"]'
  );
  console.log("💬 Chat elements found:", chatElements.length);

  // Check for error messages
  const errorElements = document.querySelectorAll(
    '[class*="error"], [class*="alert"]'
  );
  console.log("❌ Error elements found:", errorElements.length);
}

function testSocketConnection() {
  console.log("🧪 Testing Socket Connection:");
  console.log("==================");

  // Try to create a test socket connection
  if (window.io) {
    console.log("✅ Socket.IO library available");

    const testSocket = io("http://localhost:3000", {
      auth: { token: localStorage.getItem("token") },
      transports: ["websocket", "polling"],
    });

    testSocket.on("connect", () => {
      console.log("✅ Test socket connected:", testSocket.id);
      testSocket.disconnect();
    });

    testSocket.on("connect_error", (error) => {
      console.log("❌ Test socket connection error:", error.message);
    });

    setTimeout(() => {
      if (!testSocket.connected) {
        console.log("⏰ Test socket connection timeout");
        testSocket.disconnect();
      }
    }, 5000);
  } else {
    console.log("❌ Socket.IO library not available");
  }
}

function debugMessageInput() {
  console.log("📝 Message Input Debug:");
  console.log("==================");

  // Find message input elements
  const messageInputs = document.querySelectorAll(
    'input[type="text"], textarea'
  );
  console.log("📝 Input elements found:", messageInputs.length);

  messageInputs.forEach((input, index) => {
    console.log(`📝 Input ${index}:`, {
      type: input.type,
      placeholder: input.placeholder,
      value: input.value,
      disabled: input.disabled,
    });
  });

  // Find send buttons
  const sendButtons = document.querySelectorAll("button");
  const sendButtonTexts = Array.from(sendButtons)
    .map((btn) => btn.textContent?.trim())
    .filter(
      (text) =>
        text &&
        (text.toLowerCase().includes("send") ||
          text.includes("📤") ||
          text.includes("➤"))
    );
  console.log("📤 Send buttons found:", sendButtonTexts);
}

function debugNetworkRequests() {
  console.log("🌐 Network Requests Debug:");
  console.log("==================");

  // Check if we can make a test request
  fetch("http://localhost:3000/api/auth/users")
    .then((response) => {
      console.log("✅ Backend reachable:", response.status);
      return response.json();
    })
    .then((data) => {
      console.log("📊 Backend response:", data);
    })
    .catch((error) => {
      console.log("❌ Backend not reachable:", error.message);
    });
}

function debugLocalStorage() {
  console.log("💾 LocalStorage Debug:");
  console.log("==================");

  console.log("📦 All localStorage items:");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(
      `  - ${key}:`,
      value?.substring(0, 100) + (value?.length > 100 ? "..." : "")
    );
  }
}

function runAllDebugChecks() {
  console.log("🔍 Running All Debug Checks...");
  console.log("===============================");

  debugSocketConnection();
  console.log("");

  debugMessageInput();
  console.log("");

  debugLocalStorage();
  console.log("");

  debugNetworkRequests();
  console.log("");

  testSocketConnection();
}

// Export functions
window.debugMessaging = {
  debugSocketConnection,
  debugMessageInput,
  debugLocalStorage,
  debugNetworkRequests,
  testSocketConnection,
  runAllDebugChecks,
};

console.log("🔧 Debug functions available:");
console.log("- debugMessaging.runAllDebugChecks() - Run all checks");
console.log("- debugMessaging.debugSocketConnection() - Check socket");
console.log("- debugMessaging.debugMessageInput() - Check inputs");
console.log("- debugMessaging.debugLocalStorage() - Check storage");
console.log("- debugMessaging.debugNetworkRequests() - Check network");

// Auto-run checks
runAllDebugChecks();
