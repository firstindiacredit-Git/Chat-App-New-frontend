import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_CONFIG } from '../config/mobileConfig'

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isCheckingPhone, setIsCheckingPhone] = useState(false)
  const navigate = useNavigate()

  // Check if phone number already exists
  const checkPhoneExists = async (phone) => {
    if (!phone || phone.length < 10) return false
    
    try {
      setIsCheckingPhone(true)
      // const response = await fetch(`${API_CONFIG.API_URL}/auth/find-users-by-phones`, {
      const response = await fetch(`${API_CONFIG.API_URL}/auth/find-users-by-phones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumbers: [phone]
        })
      })
      
      const data = await response.json()
      return data.success && data.data.foundUsers.length > 0
    } catch (err) {
      console.error('Error checking phone:', err)
      return false
    } finally {
      setIsCheckingPhone(false)
    }
  }

  const handleChange = async (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear previous errors
    if (name === 'phone') {
      setPhoneError('')
    }
    if (name === 'email') {
      setEmailError('')
    }

    // Real-time phone validation
    if (name === 'phone' && value.trim()) {
      const phoneRegex = /^[0-9]{10,15}$/
      if (!phoneRegex.test(value.trim())) {
        setPhoneError('Please enter a valid phone number (10-15 digits only)')
        return
      }

      // Check if phone already exists
      const phoneExists = await checkPhoneExists(value.trim())
      if (phoneExists) {
        setPhoneError('This phone number is already registered. Please use a different number or try logging in.')
      }
    }

    // Real-time email validation
    if (name === 'email' && value.trim()) {
      if (!value.includes('@') || !value.includes('.')) {
        setEmailError('Please enter a valid email address')
        return
      }
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required')
      return false
    }
    
    if (!formData.phone.trim()) {
      setError('Phone number is required')
      return false
    }
    
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required')
      return false
    }
    
    // Check for field-specific errors
    if (phoneError) {
      setError(phoneError)
      return false
    }
    
    if (emailError) {
      setError(emailError)
      return false
    }
    
    // Phone number validation
    const phoneRegex = /^[0-9]{10,15}$/
    if (!phoneRegex.test(formData.phone.trim())) {
      setError('Please enter a valid phone number (10-15 digits only)')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      // Call backend API to create account and send OTP
      // const response = await fetch(`${API_CONFIG.API_URL}/auth/signup`, {
      const response = await fetch(`${API_CONFIG.API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create account')
      }

      // Store user data temporarily for OTP verification
      localStorage.setItem('signupData', JSON.stringify(formData))
      localStorage.setItem('tempEmail', formData.email)
      
      // Navigate to OTP verification
      navigate('/verify-otp')
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen-container">
      <div className="header">
        <h1>Create Account</h1>
      </div>
      
      <div className="form-container">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
          Join ChatApp
        </h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <div className="input-container">
              <input
                type="tel"
                id="phone"
                name="phone"
                className={`form-input ${phoneError ? 'error' : ''} ${isCheckingPhone ? 'checking' : ''}`}
                placeholder="Enter your phone number (10-15 digits)"
                value={formData.phone}
                onChange={handleChange}
                required
                disabled={loading || isCheckingPhone}
              />
              {isCheckingPhone && (
                <div className="checking-indicator">
                  <div className="loading-small"></div>
                </div>
              )}
            </div>
            {phoneError && (
              <div className="field-error">
                <span className="error-icon">⚠️</span>
                {phoneError}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-input ${emailError ? 'error' : ''}`}
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {emailError && (
              <div className="field-error">
                <span className="error-icon">⚠️</span>
                {emailError}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="bio">Bio (Optional)</label>
            <textarea
              id="bio"
              name="bio"
              className="form-input"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={handleChange}
              rows="3"
              disabled={loading}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !formData.name || !formData.phone || !formData.email || phoneError || emailError || isCheckingPhone}
          >
            {loading ? <span className="loading"></span> : 'Create Account'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <span style={{ color: '#666' }}>Already have an account? </span>
          <Link to="/login" className="link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Signup
