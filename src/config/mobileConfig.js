// Mobile configuration for API endpoints
const isMobile = window.Capacitor !== undefined;

// Base API URL - Uses environment variables with production fallbacks
const getBaseURL = () => {
  if (isMobile) {
    // For mobile app, use production server
    return import.meta.env.VITE_API_BASE_URL || "https://chatnew.pizeonfly.com";
  } else {
    // For web development, use environment variable or localhost fallback
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  }
};

const getSocketURL = () => {
  if (isMobile) {
    return import.meta.env.VITE_SOCKET_URL || "https://chatnew.pizeonfly.com";
  } else {
    return import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";
  }
};

export const API_CONFIG = {
  BASE_URL: getBaseURL(),
  API_URL: import.meta.env.VITE_API_URL || `${getBaseURL()}/api`,
  SOCKET_URL: getSocketURL(),
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/api/auth/login",
      REGISTER: "/api/auth/register",
      LOGOUT: "/api/auth/logout",
      VERIFY_OTP: "/api/auth/verify-otp",
    },
    MESSAGES: "/api/messages",
    USERS: "/api/users",
    UPLOAD: "/api/upload",
    STORIES: "/api/stories",
    GROUPS: "/api/groups",
    CALLS: "/api/calls",
  },
};

export const MOBILE_CONFIG = {
  isMobile,
  platform: isMobile ? window.Capacitor.getPlatform() : "web",
  // Add any mobile-specific configurations here
  enablePushNotifications: isMobile,
  enableFileSharing: isMobile,
  enableCamera: isMobile,
};
