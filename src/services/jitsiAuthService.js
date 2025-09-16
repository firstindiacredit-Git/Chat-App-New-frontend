/**
 * Jitsi Authentication Service
 * Handles automatic Jitsi login when user logs into ChatApp
 */

class JitsiAuthService {
  constructor() {
    this.jitsiUser = null;
    this.isJitsiAuthenticated = false;
    this.jitsiToken = null;
    this.jitsiDomain = "meet.jit.si";
    this.listeners = new Set();
  }

  /**
   * Initialize Jitsi authentication with user data
   * Called automatically when user logs into ChatApp
   */
  async initializeJitsiAuth(userData) {
    try {
      console.log(
        "🎥 Initializing Jitsi authentication for user:",
        userData.name
      );

      // Create Jitsi user profile from ChatApp user data
      const jitsiUserData = {
        id: userData.id,
        name: userData.name,
        email: userData.email || `${userData.id}@chatapp.local`,
        avatar: userData.avatar || this.generateAvatarUrl(userData.name),
        phone: userData.phone,
        displayName: userData.name,
        // Generate a unique Jitsi user ID
        jitsiUserId: `chatapp_${userData.id}`,
        // Use ChatApp token as base for Jitsi authentication
        chatAppToken: userData.token,
      };

      // Store Jitsi user data
      this.jitsiUser = jitsiUserData;

      // Generate Jitsi-compatible token
      this.jitsiToken = await this.generateJitsiToken(jitsiUserData);

      // Mark as authenticated
      this.isJitsiAuthenticated = true;

      // Store in localStorage for persistence
      localStorage.setItem("jitsi_user", JSON.stringify(jitsiUserData));
      localStorage.setItem("jitsi_token", this.jitsiToken);
      localStorage.setItem("jitsi_authenticated", "true");

      // Notify listeners
      this.notifyListeners("authenticated", jitsiUserData);

      console.log("✅ Jitsi authentication successful");
      return {
        success: true,
        user: jitsiUserData,
        token: this.jitsiToken,
      };
    } catch (error) {
      console.error("❌ Jitsi authentication failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate Jitsi-compatible authentication token
   */
  async generateJitsiToken(userData) {
    try {
      // Create JWT header
      const header = {
        alg: "HS256",
        typ: "JWT",
      };

      // Create JWT payload
      const payload = {
        iss: "chatapp",
        sub: "meet.jit.si",
        aud: "jitsi",
        room: "*", // Allow access to all rooms
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
        iat: Math.floor(Date.now() / 1000), // Issued at
        context: {
          user: {
            id: userData.jitsiUserId,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
          },
          features: {
            livestreaming: false,
            recording: false,
            transcription: false,
            "outbound-call": false,
          },
        },
      };

      // Create a simple JWT-like token (for development)
      // In production, use a proper JWT library with HMAC signing
      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
      const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

      // For development, we'll create a simple signature
      // In production, this should be properly signed with a secret key
      const signature = this.base64UrlEncode(
        `chatapp_signature_${userData.id}`
      );

      const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;

      return jwt;
    } catch (error) {
      console.error("Error generating Jitsi token:", error);
      throw error;
    }
  }

  /**
   * Base64 URL encode (JWT standard)
   */
  base64UrlEncode(str) {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Get current Jitsi user data
   */
  getJitsiUser() {
    if (!this.jitsiUser) {
      // Try to load from localStorage
      const savedUser = localStorage.getItem("jitsi_user");
      if (savedUser) {
        try {
          this.jitsiUser = JSON.parse(savedUser);
          this.jitsiToken = localStorage.getItem("jitsi_token");
          this.isJitsiAuthenticated =
            localStorage.getItem("jitsi_authenticated") === "true";
        } catch (error) {
          console.error("Error loading saved Jitsi user:", error);
        }
      }
    }

    return this.jitsiUser;
  }

  /**
   * Check if user is authenticated with Jitsi
   */
  isAuthenticated() {
    return this.isJitsiAuthenticated && this.jitsiUser && this.jitsiToken;
  }

  /**
   * Get Jitsi configuration for video calls
   */
  getJitsiConfig(roomName, callType = "video") {
    const user = this.getJitsiUser();

    if (!user) {
      throw new Error("User not authenticated with Jitsi");
    }

    return {
      roomName: roomName,
      width: "100%",
      height: "100%",
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: callType === "voice",
        enableWelcomePage: false,
        prejoinPageEnabled: false,
        disableModeratorIndicator: false,
        startScreenSharing: false,
        enableEmailInStats: false,
        enableLobby: false,
        enableClosePage: false,
        requireDisplayName: true, // Ensure user name is displayed
        enableUserRolesBasedOnToken: false, // Disable token-based roles for now
        enableInsecureRoomNameWarning: false,
        // Use public Jitsi server with anonymous access
        hosts: {
          domain: this.jitsiDomain,
          muc: `conference.${this.jitsiDomain}`,
        },
        // Enable anonymous authentication (no JWT required)
        enableAnonymousAuthentication: true,
        enableGuestDomain: true,
        // Disable token-based auth for now
        tokenAuthUrl: null,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          "microphone",
          "camera",
          "closedcaptions",
          "desktop",
          "fullscreen",
          "fodeviceselection",
          "hangup",
          "profile",
          "chat",
          "recording",
          "livestreaming",
          "etherpad",
          "sharedvideo",
          "settings",
          "raisehand",
          "videoquality",
          "filmstrip",
          "invite",
          "feedback",
          "stats",
          "shortcuts",
          "tileview",
          "videobackgroundblur",
          "download",
          "help",
          "mute-everyone",
          "security",
        ],
        SETTINGS_SECTIONS: [
          "devices",
          "language",
          "moderator",
          "profile",
          "calendar",
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        SHOW_POLICY_WATERMARK: false,
        SHOW_LOBBY_BUTTON: false,
        SHOW_MEETING_TIMER: true,
        SHOW_CLOSE_PAGE: false,
        SHOW_PREJOIN_PAGE: false,
        SHOW_WELCOME_PAGE: false,
        // Custom branding
        DEFAULT_BACKGROUND: "#25D366",
        INITIAL_TOOLBAR_TIMEOUT: 20000,
        TOOLBAR_TIMEOUT: 4000,
      },
      userInfo: {
        displayName: user.name,
        email: user.email,
        avatarURL: user.avatar,
      },
      // Remove JWT for now to avoid token errors
      // jwt: this.jitsiToken,
    };
  }

  /**
   * Create a room name for a call between two users
   */
  generateRoomName(currentUserId, otherUserId, callType = "video") {
    // Create a consistent room name regardless of who initiates the call
    const users = [currentUserId, otherUserId].sort();
    const timestamp = Date.now().toString().slice(-6);
    return `chatapp_${users[0]}_${users[1]}_${callType}_${timestamp}`;
  }

  /**
   * Generate avatar URL if user doesn't have one
   */
  generateAvatarUrl(name) {
    const initial = name?.charAt(0)?.toUpperCase() || "U";
    const colors = [
      "#25D366",
      "#128C7E",
      "#34B7F1",
      "#AD5CE4",
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
    ];
    const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
    const color = colors[colorIndex];

    // Generate a simple avatar URL (you can use a service like Gravatar or UI Avatars)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=${color.slice(1)}&color=fff&size=128`;
  }

  /**
   * Logout from Jitsi when user logs out from ChatApp
   */
  logout() {
    console.log("🎥 Logging out from Jitsi");

    this.jitsiUser = null;
    this.isJitsiAuthenticated = false;
    this.jitsiToken = null;

    // Clear localStorage
    localStorage.removeItem("jitsi_user");
    localStorage.removeItem("jitsi_token");
    localStorage.removeItem("jitsi_authenticated");

    // Notify listeners
    this.notifyListeners("logout");

    console.log("✅ Jitsi logout successful");
  }

  /**
   * Add event listener for authentication events
   */
  addListener(callback) {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of authentication events
   */
  notifyListeners(event, data = null) {
    this.listeners.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error in Jitsi auth listener:", error);
      }
    });
  }

  /**
   * Get authentication status info
   */
  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated(),
      user: this.getJitsiUser(),
      hasToken: !!this.jitsiToken,
      domain: this.jitsiDomain,
    };
  }

  /**
   * Refresh authentication (extend token validity)
   */
  async refreshAuth() {
    if (!this.jitsiUser) {
      throw new Error("No user to refresh authentication for");
    }

    try {
      console.log("🔄 Refreshing Jitsi authentication");

      // Generate new token
      this.jitsiToken = await this.generateJitsiToken(this.jitsiUser);

      // Update localStorage
      localStorage.setItem("jitsi_token", this.jitsiToken);

      // Notify listeners
      this.notifyListeners("refreshed", this.jitsiUser);

      console.log("✅ Jitsi authentication refreshed");
      return true;
    } catch (error) {
      console.error("❌ Failed to refresh Jitsi authentication:", error);
      return false;
    }
  }
}

// Create singleton instance
const jitsiAuthService = new JitsiAuthService();

export default jitsiAuthService;
