import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initializeMobileApp } from './utils/mobileInit'
import { register as registerSW } from './utils/serviceWorkerRegistration'
import { autoTestNotifications } from './utils/testNotification'

// Initialize mobile app if running on mobile
initializeMobileApp();

// Register service worker for notifications
registerSW({
  onSuccess: () => {
    console.log('📱 Service Worker registered successfully for notifications');
    // Auto-test notifications in development
    if (import.meta.env.DEV) {
      autoTestNotifications();
    }
  },
  onUpdate: () => {
    console.log('📱 Service Worker updated - new content available');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)