import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_CONFIG } from '../config/mobileConfig'

const OTPVerification = ({ onLogin }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef([])
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return // Prevent multiple characters
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const otpString = otp.join('')
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code')
      setLoading(false)
      return
    }

    try {
      const email = localStorage.getItem('tempEmail')
      const signupData = localStorage.getItem('signupData')
      
      if (!email) {
        setError('Email not found. Please start over.')
        setLoading(false)
        return
      }

      let response
      if (signupData) {
        // User is signing up - verify OTP and complete signup
        const parsedSignupData = JSON.parse(signupData)
        response = await fetch(`${API_CONFIG.API_URL}/auth/verify-otp-signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email,
            otp: otpString,
            signupData: parsedSignupData
          }),
        })
      } else {
        // User is logging in
        response = await fetch(`${API_CONFIG.API_URL}/auth/verify-otp-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, otp: otpString }),
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed')
      }

      // Store user data and token
      const userData = {
        ...data.data.user,
        token: data.data.token
      }
      
      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.removeItem('tempEmail')
      localStorage.removeItem('signupData')
      
      onLogin(userData)
      navigate('/chat')
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setCanResend(false)
    setTimeLeft(60)
    setOtp(['', '', '', '', '', ''])
    setError('')
    
    const email = localStorage.getItem('tempEmail')
    const signupData = localStorage.getItem('signupData')
    
    try {
      const type = signupData ? 'signup' : 'login'
      const response = await fetch(`${API_CONFIG.API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, type }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend code')
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.')
    }
    
    // Reset timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="screen-container">
      <div className="header">
        <h1>Verify Your Email</h1>
      </div>
      
      <div className="form-container">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: '#666', marginBottom: '0.5rem' }}>
            We've sent a 6-digit verification code to:
          </p>
          <p style={{ fontWeight: '600', color: '#333' }}>
            {localStorage.getItem('tempEmail')}
          </p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="1"
                className="otp-input"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                style={{
                  width: '45px',
                  height: '50px',
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#25D366'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              />
            ))}
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || otp.join('').length !== 6}
          >
            {loading ? <span className="loading"></span> : 'Verify Code'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          {canResend ? (
            <button 
              onClick={handleResendCode}
              className="link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Resend Code
            </button>
          ) : (
            <p style={{ color: '#666' }}>
              Resend code in {formatTime(timeLeft)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default OTPVerification
