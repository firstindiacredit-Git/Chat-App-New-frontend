import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Signup from './components/Signup'
import Chat from './components/Chat'
import OTPVerification from './components/OTPVerification'
import UserList from './components/UserList'
import { SocketProvider } from './contexts/SocketContext'
import { API_CONFIG } from './config/mobileConfig'
import './App.css'

function App() {
  const [user, setUser] = React.useState(null)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)

  // Check for existing user on app load
  React.useEffect(() => {
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