import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { Filesystem } from "@capacitor/filesystem";
import { Device } from "@capacitor/device";
import { Contacts } from "@capacitor-community/contacts";

// Check if running on mobile platform
export const isMobilePlatform = () => {
  return Capacitor.isNativePlatform();
};

// Check if running on Android
export const isAndroid = () => {
  return Capacitor.getPlatform() === "android";
};

// Check if running on iOS
export const isIOS = () => {
  return Capacitor.getPlatform() === "ios";
};

// Get device info
export const getDeviceInfo = async () => {
  try {
    if (!isMobilePlatform()) {
      return {
        platform: "web",
        model: "Browser",
        operatingSystem: "web",
        osVersion: "unknown",
      };
    }

    const info = await Device.getInfo();
    return info;
  } catch (error) {
    console.error("Error getting device info:", error);
    return null;
  }
};

// Request camera permission
export const requestCameraPermission = async () => {
  try {
    if (!isMobilePlatform()) {
      // For web, try to access camera to trigger permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return { granted: true, message: "Camera permission granted" };
      } catch (error) {
        return {
          granted: false,
          message: "Camera permission denied or not available",
        };
      }
    }

    const permission = await Camera.requestPermissions();

    if (permission.camera === "granted") {
      return { granted: true, message: "Camera permission granted" };
    } else {
      return { granted: false, message: "Camera permission denied" };
    }
  } catch (error) {
    console.error("Error requesting camera permission:", error);
    return { granted: false, message: "Error requesting camera permission" };
  }
};

// Request storage permission
export const requestStoragePermission = async () => {
  try {
    if (!isMobilePlatform()) {
      // Web browsers handle storage automatically
      return { granted: true, message: "Storage permission granted (web)" };
    }

    const permission = await Filesystem.requestPermissions();

    if (permission.publicStorage === "granted") {
      return { granted: true, message: "Storage permission granted" };
    } else {
      return { granted: false, message: "Storage permission denied" };
    }
  } catch (error) {
    console.error("Error requesting storage permission:", error);
    return { granted: false, message: "Error requesting storage permission" };
  }
};

// Request contacts permission
export const requestContactsPermission = async () => {
  try {
    if (!isMobilePlatform()) {
      // For web, check if Contacts API is available
      if ("contacts" in navigator && "ContactsManager" in window) {
        try {
          const contacts = await navigator.contacts.select(["name"], {
            multiple: false,
          });
          return {
            granted: true,
            message: "Contacts permission granted (web)",
          };
        } catch (error) {
          return {
            granted: false,
            message: "Contacts permission denied or not available",
          };
        }
      } else {
        return {
          granted: false,
          message: "Contacts API not available in this browser",
        };
      }
    }

    // Check if Contacts plugin is available
    if (!Contacts || typeof Contacts.requestPermissions !== "function") {
      console.error("Contacts plugin not available");
      return {
        granted: false,
        message:
          "Contacts plugin not properly installed. Please use manual entry.",
      };
    }

    const permission = await Contacts.requestPermissions();

    if (permission.contacts === "granted") {
      return { granted: true, message: "Contacts permission granted" };
    } else {
      return { granted: false, message: "Contacts permission denied" };
    }
  } catch (error) {
    console.error("Error requesting contacts permission:", error);

    // Provide specific error messages based on error type
    if (error.message && error.message.includes("not implemented")) {
      return {
        granted: false,
        message:
          "Contacts feature not available on this device. Please use manual entry.",
      };
    } else if (error.message && error.message.includes("permission")) {
      return {
        granted: false,
        message:
          "Contacts permission was denied. Please enable it in device settings or use manual entry.",
      };
    } else {
      return {
        granted: false,
        message:
          "Unable to access contacts. Please use manual phone number entry.",
      };
    }
  }
};

// Get contacts from device
export const getDeviceContacts = async () => {
  try {
    if (!isMobilePlatform()) {
      // For web, use Contacts API
      if ("contacts" in navigator && "ContactsManager" in window) {
        try {
          const contacts = await navigator.contacts.select(["name", "tel"], {
            multiple: true,
          });
          return {
            success: true,
            contacts: contacts.map((contact) => ({
              name: contact.name?.[0] || "Unknown",
              phoneNumbers: contact.tel || [],
            })),
            message: "Contacts retrieved successfully",
          };
        } catch (error) {
          return {
            success: false,
            contacts: [],
            message: "Failed to get contacts from web API",
          };
        }
      } else {
        return {
          success: false,
          contacts: [],
          message: "Contacts API not available in this browser",
        };
      }
    }

    // For mobile platforms
    // Check if Contacts plugin is available
    if (!Contacts || typeof Contacts.getContacts !== "function") {
      console.error("Contacts plugin not available");
      return {
        success: false,
        contacts: [],
        message:
          "Contacts plugin not properly installed. Please use manual entry.",
      };
    }

    const result = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
      },
    });

    return {
      success: true,
      contacts: result.contacts.map((contact) => ({
        name: contact.name?.display || contact.name?.given || "Unknown",
        phoneNumbers: contact.phones?.map((phone) => phone.number) || [],
      })),
      message: "Contacts retrieved successfully",
    };
  } catch (error) {
    console.error("Error getting device contacts:", error);

    // Provide specific error messages
    if (error.message && error.message.includes("not implemented")) {
      return {
        success: false,
        contacts: [],
        message:
          "Contacts feature not available on this device. Please use manual entry.",
      };
    } else if (error.message && error.message.includes("permission")) {
      return {
        success: false,
        contacts: [],
        message:
          "Contacts permission denied. Please enable it in settings or use manual entry.",
      };
    } else {
      return {
        success: false,
        contacts: [],
        message:
          "Unable to access contacts. Please use manual phone number entry.",
      };
    }
  }
};

// Request all necessary permissions at once
export const requestAllPermissions = async () => {
  const results = {
    camera: await requestCameraPermission(),
    storage: await requestStoragePermission(),
    contacts: await requestContactsPermission(),
  };

  const allGranted = Object.values(results).every((result) => result.granted);

  return {
    allGranted,
    results,
    message: allGranted
      ? "All permissions granted"
      : "Some permissions were denied",
  };
};

// Check if all permissions are already granted
export const checkPermissions = async () => {
  try {
    const results = {
      camera: { granted: false, message: "Not checked" },
      storage: { granted: false, message: "Not checked" },
      contacts: { granted: false, message: "Not checked" },
    };

    if (!isMobilePlatform()) {
      // For web, we can't check permissions without requesting them
      return {
        allGranted: false,
        results,
        message: "Running on web - permissions need to be requested",
      };
    }

    // Check camera permission
    try {
      const cameraStatus = await Camera.checkPermissions();
      results.camera = {
        granted: cameraStatus.camera === "granted",
        message: cameraStatus.camera,
      };
    } catch (error) {
      results.camera.message = "Error checking camera permission";
    }

    // Check storage permission
    try {
      const storageStatus = await Filesystem.checkPermissions();
      results.storage = {
        granted: storageStatus.publicStorage === "granted",
        message: storageStatus.publicStorage,
      };
    } catch (error) {
      results.storage.message = "Error checking storage permission";
    }

    // Check contacts permission
    try {
      const contactsStatus = await Contacts.checkPermissions();
      results.contacts = {
        granted: contactsStatus.contacts === "granted",
        message: contactsStatus.contacts,
      };
    } catch (error) {
      results.contacts.message = "Error checking contacts permission";
    }

    const allGranted = Object.values(results).every((result) => result.granted);

    return {
      allGranted,
      results,
      message: allGranted
        ? "All permissions granted"
        : "Some permissions not granted",
    };
  } catch (error) {
    console.error("Error checking permissions:", error);
    return {
      allGranted: false,
      results: {},
      message: "Error checking permissions",
    };
  }
};

// Show permission explanation dialog
export const showPermissionExplanation = () => {
  return {
    title: "Permissions Required",
    message: `This app needs the following permissions to work properly:

📷 Camera: To take photos and videos for sharing
💾 Storage: To save and access media files
📱 Contacts: To find friends who are using this app

Your privacy is important - we only use these permissions for app functionality.`,
    buttons: [
      { text: "Cancel", role: "cancel" },
      { text: "Grant Permissions", role: "confirm" },
    ],
  };
};

// Format permissions status for display
export const formatPermissionsStatus = (permissionResults) => {
  const status = [];

  Object.entries(permissionResults.results).forEach(([key, result]) => {
    const icon = result.granted ? "✅" : "❌";
    const name = key.charAt(0).toUpperCase() + key.slice(1);
    status.push(`${icon} ${name}: ${result.message}`);
  });

  return status.join("\n");
};

export default {
  isMobilePlatform,
  isAndroid,
  isIOS,
  getDeviceInfo,
  requestCameraPermission,
  requestStoragePermission,
  requestContactsPermission,
  getDeviceContacts,
  requestAllPermissions,
  checkPermissions,
  showPermissionExplanation,
  formatPermissionsStatus,
};
