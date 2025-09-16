// Debug Token Issues
console.log("🔍 Debugging Token Issues...");

function debugToken() {
  console.log("🔑 Token Debug Information:");
  console.log("==================");

  // Check localStorage
  const localToken = localStorage.getItem("token");
  const localAuthToken = localStorage.getItem("authToken");

  // Check sessionStorage
  const sessionToken = sessionStorage.getItem("token");
  const sessionAuthToken = sessionStorage.getItem("authToken");

  console.log("📦 localStorage:");
  console.log("  - token:", localToken ? "Exists" : "Not found");
  console.log("  - authToken:", localAuthToken ? "Exists" : "Not found");

  console.log("📦 sessionStorage:");
  console.log("  - token:", sessionToken ? "Exists" : "Not found");
  console.log("  - authToken:", sessionAuthToken ? "Exists" : "Not found");

  // Check all localStorage keys
  console.log("📦 All localStorage keys:");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(
      `  - ${key}:`,
      localStorage.getItem(key)?.substring(0, 50) + "..."
    );
  }

  // Check all sessionStorage keys
  console.log("📦 All sessionStorage keys:");
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    console.log(
      `  - ${key}:`,
      sessionStorage.getItem(key)?.substring(0, 50) + "..."
    );
  }

  // Find any token-like values
  console.log("🔍 Searching for token-like values:");
  const allStorage = { ...localStorage, ...sessionStorage };
  Object.keys(allStorage).forEach((key) => {
    const value = allStorage[key];
    if (value && value.startsWith("eyJ")) {
      console.log(`  - Found JWT in ${key}:`, value.substring(0, 50) + "...");
    }
  });

  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem("user") || "null");
  console.log("👤 User object:", user);
  if (user && user.token) {
    console.log("✅ User has token:", user.token.substring(0, 50) + "...");
  }
}

function clearAllTokens() {
  console.log("🧹 Clearing all tokens...");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("authToken");
  console.log("✅ All tokens cleared");
}

function setTestToken() {
  console.log("🧪 Setting test token...");
  const testToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzhmYjQ4YzQ4YzQ4YzQ4YzQ4YzQ4YzQiLCJpYXQiOjE3MzQ5NjQ4MDAsImV4cCI6MTczNDk2ODQwMH0.test";
  localStorage.setItem("token", testToken);
  console.log("✅ Test token set");
}

// Export functions
window.debugToken = debugToken;
window.clearAllTokens = clearAllTokens;
window.setTestToken = setTestToken;

console.log("🔧 Debug functions available:");
console.log("- debugToken() - Check all token storage");
console.log("- clearAllTokens() - Clear all tokens");
console.log("- setTestToken() - Set a test token");

// Auto-run debug
debugToken();
