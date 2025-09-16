import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Signup from './components/Signup'
import Chat from './components/Chat'
import OTPVerification from './components/OTPVerification'
import UserList from './components/UserList'
import MobilePermissions from './components/MobilePermissions'
import { SocketProvider } from './contexts/SocketContext'
import { API_CONFIG } from './config/mobileConfig'
import { isMobilePlatform } from './utils/mobilePermissions'
import './App.css'

function App() {
  const [user, setUser] = React.useState(null)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [showPermissions, setShowPermissions] = React.useState(false)
  const [permissionsChecked, setPermissionsChecked] = React.useState(false)

  // Check for existing user and mobile permissions on app load
  React.useEffect(() => {
    const initializeApp = async () => {
      // Check for existing user
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          setIsAuthenticated(true)
        } catch (error) {
          console.error('Error parsing saved user:', error)
          localStorage.removeItem('user')
        }
      }

      // Check if we need to show permissions for mobile
      if (isMobilePlatform()) {
        const permissionsShown = localStorage.getItem('mobile_permissions_shown')
        if (!permissionsShown) {
          setShowPermissions(true)
        } else {
          setPermissionsChecked(true)
        }
      } else {
        setPermissionsChecked(true)
      }
    }

    initializeApp()
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('user')
    
    // Call logout API if needed
    const token = user?.token
    if (token) {
      fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(error => {
        console.error('Logout API call failed:', error)
      })
    }
  }

  const handlePermissionsGranted = (permissionResults) => {
    console.log('Permissions granted:', permissionResults)
    localStorage.setItem('mobile_permissions_shown', 'true')
    localStorage.setItem('mobile_permissions_status', JSON.stringify(permissionResults))
    setShowPermissions(false)
    setPermissionsChecked(true)
  }

  const handlePermissionsSkipped = () => {
    console.log('Permissions skipped')
    localStorage.setItem('mobile_permissions_shown', 'true')
    localStorage.setItem('mobile_permissions_status', JSON.stringify({ allGranted: false, skipped: true }))
    setShowPermissions(false)
    setPermissionsChecked(true)
  }

  // Show permissions screen if needed
  if (showPermissions && !permissionsChecked) {
    return (
      <MobilePermissions 
        onPermissionsGranted={handlePermissionsGranted}
        onSkip={handlePermissionsSkipped}
      />
    )
  }

  // Don't render main app until permissions are checked
  if (!permissionsChecked) {
    return (
      <div className="app">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column'
        }}>
          <div className="loading-spinner" style={{ marginBottom: '1rem' }}></div>
          <p>Loading ChatApp...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
              <Navigate to="/chat" replace /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
              <Navigate to="/chat" replace /> : 
              <Login onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/signup" 
            element={
              isAuthenticated ? 
              <Navigate to="/chat" replace /> : 
              <Signup />
            } 
          />
          <Route 
            path="/verify-otp" 
            element={
              isAuthenticated ? 
              <Navigate to="/chat" replace /> : 
              <OTPVerification onLogin={handleLogin} />
            } 
          />
        <Route
          path="/chat"
          element={
            isAuthenticated ?
            <SocketProvider user={user}>
              <Chat user={user} onLogout={handleLogout} />
            </SocketProvider> :
            <Navigate to="/login" replace />
          }
        />
        <Route
          path="/users"
          element={
            isAuthenticated ?
            <SocketProvider user={user}>
              <UserList user={user} onLogout={handleLogout} />
            </SocketProvider> :
            <Navigate to="/login" replace />
          }
        />
        </Routes>
      </div>
    </Router>
  )
}

export default App