// Debug File Sharing Issues
console.log("🔍 Debugging File Sharing Issues...");

function debugFileSharing() {
  console.log("📎 File Sharing Debug:");
  console.log("==================");

  // Check if file input exists
  const fileInputs = document.querySelectorAll('input[type="file"]');
  console.log("📎 File inputs found:", fileInputs.length);

  fileInputs.forEach((input, index) => {
    console.log(`📎 File input ${index}:`, {
      id: input.id,
      name: input.name,
      accept: input.accept,
      multiple: input.multiple,
      disabled: input.disabled,
    });
  });

  // Check for attachment buttons
  const attachmentButtons = document.querySelectorAll("button");
  const attachmentButtonTexts = Array.from(attachmentButtons)
    .map((btn) => btn.textContent?.trim())
    .filter(
      (text) =>
        text &&
        (text.includes("📎") ||
          text.includes("📁") ||
          text.includes("📷") ||
          text.includes("📹") ||
          text.toLowerCase().includes("attach") ||
          text.toLowerCase().includes("file"))
    );
  console.log("📎 Attachment buttons found:", attachmentButtonTexts);

  // Check for drag and drop areas
  const dragAreas = document.querySelectorAll(
    '[class*="drag"], [class*="drop"]'
  );
  console.log("📎 Drag & drop areas found:", dragAreas.length);

  // Check for file preview elements
  const previewElements = document.querySelectorAll(
    '[class*="preview"], [class*="thumbnail"]'
  );
  console.log("📎 Preview elements found:", previewElements.length);
}

function testFileSelection() {
  console.log("🧪 Testing File Selection:");
  console.log("==================");

  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    console.log("✅ File input found");

    // Create a test file
    const testFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });

    // Simulate file selection
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(testFile);
    fileInput.files = dataTransfer.files;

    // Trigger change event
    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    console.log("✅ Test file selected:", testFile.name);
  } else {
    console.log("❌ No file input found");
  }
}

function debugMessageTypes() {
  console.log("💬 Message Types Debug:");
  console.log("==================");

  // Check for different message types in the DOM
  const messageElements = document.querySelectorAll('[class*="message"]');
  console.log("💬 Message elements found:", messageElements.length);

  // Check for image messages
  const imageMessages = document.querySelectorAll(
    'img[src*="cloudinary"], img[src*="upload"]'
  );
  console.log("🖼️ Image messages found:", imageMessages.length);

  // Check for file messages
  const fileMessages = document.querySelectorAll(
    '[class*="file"], [class*="attachment"]'
  );
  console.log("📎 File messages found:", fileMessages.length);

  // Check for video messages
  const videoMessages = document.querySelectorAll("video");
  console.log("🎥 Video messages found:", videoMessages.length);
}

function debugSocketFileEvents() {
  console.log("🔌 Socket File Events Debug:");
  console.log("==================");

  // Check if socket is available
  const socket = window.socket || window.io?.socket;
  if (socket) {
    console.log("✅ Socket available");

    // Listen for file-related events
    socket.on("new-message", (data) => {
      if (data.message && data.message.attachment) {
        console.log("📎 File message received:", {
          type: data.message.messageType,
          attachment: data.message.attachment,
          url: data.message.attachment.url,
        });
      }
    });

    socket.on("message-sent", (data) => {
      if (data.message && data.message.attachment) {
        console.log("📎 File message sent confirmation:", {
          type: data.message.messageType,
          attachment: data.message.attachment,
          url: data.message.attachment.url,
        });
      }
    });

    console.log("✅ File event listeners attached");
  } else {
    console.log("❌ Socket not available");
  }
}

function debugCloudinaryUrls() {
  console.log("☁️ Cloudinary URLs Debug:");
  console.log("==================");

  // Check for Cloudinary URLs in the page
  const cloudinaryImages = document.querySelectorAll('img[src*="cloudinary"]');
  console.log("☁️ Cloudinary images found:", cloudinaryImages.length);

  cloudinaryImages.forEach((img, index) => {
    console.log(`☁️ Cloudinary image ${index}:`, {
      src: img.src,
      alt: img.alt,
      width: img.width,
      height: img.height,
    });
  });

  // Check for Cloudinary URLs in localStorage
  const allStorage = { ...localStorage, ...sessionStorage };
  Object.keys(allStorage).forEach((key) => {
    const value = allStorage[key];
    if (value && value.includes("cloudinary")) {
      console.log(`☁️ Cloudinary URL in ${key}:`, value);
    }
  });
}

function runAllFileDebugChecks() {
  console.log("🔍 Running All File Debug Checks...");
  console.log("===================================");

  debugFileSharing();
  console.log("");

  debugMessageTypes();
  console.log("");

  debugSocketFileEvents();
  console.log("");

  debugCloudinaryUrls();
  console.log("");

  testFileSelection();
}

// Export functions
window.debugFileSharing = {
  debugFileSharing,
  debugMessageTypes,
  debugSocketFileEvents,
  debugCloudinaryUrls,
  testFileSelection,
  runAllFileDebugChecks,
};

console.log("🔧 File debug functions available:");
console.log("- debugFileSharing.runAllFileDebugChecks() - Run all checks");
console.log("- debugFileSharing.debugFileSharing() - Check file inputs");
console.log("- debugFileSharing.debugMessageTypes() - Check message types");
console.log("- debugFileSharing.debugSocketFileEvents() - Check socket events");
console.log("- debugFileSharing.debugCloudinaryUrls() - Check Cloudinary URLs");
console.log("- debugFileSharing.testFileSelection() - Test file selection");

// Auto-run checks
runAllFileDebugChecks();
