import React, { useState } from 'react'
import { API_CONFIG } from '../config/mobileConfig'
import { Link, useNavigate } from 'react-router-dom'

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Basic email validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      // Call backend API to send OTP
      const response = await fetch(`${API_CONFIG.API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code')
      }

      // Store email in localStorage for OTP verification
      localStorage.setItem('tempEmail', email)
      
      // Navigate to OTP verification
      navigate('/verify-otp')
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen-container">
      <div className="header">
        <h1>Welcome to ChatApp</h1>
      </div>
      
      <div className="form-container">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
          Sign In
        </h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !email}
          >
            {loading ? <span className="loading"></span> : 'Send Verification Code'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <span style={{ color: '#666' }}>Don't have an account? </span>
          <Link to="/signup" className="link">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login
