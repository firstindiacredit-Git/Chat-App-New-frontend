import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

class MobileNavigationService {
  constructor() {
    this.navigationStack = [];
    this.backButtonListeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize mobile navigation handling
   */
  async initialize() {
    if (this.isInitialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Handle hardware back button on mobile
      await App.addListener('backButton', (event) => {
        console.log('📱 Hardware back button pressed');
        this.handleBackButton(event);
      });

      // Handle app state changes
      await App.addListener('appStateChange', (state) => {
        console.log('📱 App state changed:', state);
        if (state.isActive) {
          console.log('📱 App became active');
        } else {
          console.log('📱 App went to background');
        }
      });

      this.isInitialized = true;
      console.log('✅ Mobile navigation service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize mobile navigation:', error);
    }
  }

  /**
   * Handle hardware back button press
   */
  handleBackButton(event) {
    // Check if any listeners want to handle the back button
    let handled = false;
    
    this.backButtonListeners.forEach(listener => {
      try {
        const result = listener();
        if (result === true) {
          handled = true;
        }
      } catch (error) {
        console.error('Error in back button listener:', error);
      }
    });

    if (!handled) {
      // Default behavior: navigate back in history
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // If no history, minimize app instead of closing
        this.minimizeApp();
      }
    }
  }

  /**
   * Add back button listener
   */
  addBackButtonListener(callback) {
    this.backButtonListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.backButtonListeners.delete(callback);
    };
  }

  /**
   * Push route to navigation stack
   */
  pushRoute(route) {
    this.navigationStack.push(route);
    console.log('📱 Navigation stack:', this.navigationStack);
  }

  /**
   * Pop route from navigation stack
   */
  popRoute() {
    const route = this.navigationStack.pop();
    console.log('📱 Navigation stack after pop:', this.navigationStack);
    return route;
  }

  /**
   * Get current navigation stack
   */
  getNavigationStack() {
    return [...this.navigationStack];
  }

  /**
   * Clear navigation stack
   */
  clearNavigationStack() {
    this.navigationStack = [];
    console.log('📱 Navigation stack cleared');
  }

  /**
   * Minimize app instead of closing
   */
  async minimizeApp() {
    try {
      if (Capacitor.isNativePlatform()) {
        // Send app to background
        await App.minimizeApp();
        console.log('📱 App minimized');
      } else {
        // For web, just log
        console.log('📱 Back button pressed on web - staying in app');
      }
    } catch (error) {
      console.error('❌ Failed to minimize app:', error);
    }
  }

  /**
   * Handle deep navigation (prevent app closing)
   */
  handleDeepNavigation(currentPath, targetPath) {
    console.log(`📱 Navigating from ${currentPath} to ${targetPath}`);
    
    // Add current path to stack if not already there
    if (this.navigationStack[this.navigationStack.length - 1] !== currentPath) {
      this.pushRoute(currentPath);
    }

    // Navigate to target
    this.pushRoute(targetPath);
  }

  /**
   * Get proper back navigation target
   */
  getBackTarget(currentPath) {
    // Remove current path from stack
    const stack = this.getNavigationStack();
    if (stack[stack.length - 1] === currentPath) {
      this.popRoute();
    }

    // Get previous route
    const previousRoute = this.popRoute();
    
    if (previousRoute) {
      return previousRoute;
    }

    // Default fallback routes
    const fallbackRoutes = {
      '/profile': '/chat',
      '/contact-sync': '/chat',
      '/group-details': '/chat',
      '/call-history': '/chat',
      '/chat': '/', // Go to user list
    };

    return fallbackRoutes[currentPath] || '/chat';
  }

  /**
   * Check if app should close or navigate back
   */
  shouldCloseApp(currentPath) {
    const homeRoutes = ['/', '/chat', '/login'];
    return homeRoutes.includes(currentPath) && this.navigationStack.length === 0;
  }
}

// Create singleton instance
const mobileNavigationService = new MobileNavigationService();

// Auto-initialize on mobile platforms
if (Capacitor.isNativePlatform()) {
  mobileNavigationService.initialize();
}

export default mobileNavigationService;
