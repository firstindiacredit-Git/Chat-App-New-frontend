import React, { useState, useRef } from 'react'
import { API_CONFIG } from '../config/mobileConfig'

const AvatarUpload = ({ user, onAvatarUpdate }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }
      
      setSelectedFile(file)
      setError('')
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    
    setLoading(true)
    setError('')
    
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('avatar', selectedFile)
      
      // Get user token from localStorage
      const token = user.token
      if (!token) {
        setError('Authentication required. Please login again.')
        setLoading(false)
        return
      }
      
      // Upload to backend API
      const response = await fetch(`${API_CONFIG.API_URL}/avatar/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload avatar')
      }
      
      // Update user avatar in localStorage
      const updatedUser = { ...user, avatar: data.data.avatar }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      // Call parent callback
      if (onAvatarUpdate) {
        onAvatarUpdate(updatedUser)
      }
      
      // Reset state
      setSelectedFile(null)
      setPreviewUrl(null)
      
      // Show success message
      alert('Avatar updated successfully!')
      
    } catch (err) {
      setError(err.message || 'Failed to upload avatar. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAvatar = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError('')
  }

  const handleDeleteAvatar = async () => {
    if (!user.avatar) return
    
    setLoading(true)
    setError('')
    
    try {
      // Get user token from localStorage
      const token = user.token
      if (!token) {
        setError('Authentication required. Please login again.')
        setLoading(false)
        return
      }
      
      // Delete avatar from backend API
      const response = await fetch(`${API_CONFIG.API_URL}/avatar/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete avatar')
      }
      
      // Update user avatar in localStorage
      const updatedUser = { ...user, avatar: '' }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      // Call parent callback
      if (onAvatarUpdate) {
        onAvatarUpdate(updatedUser)
      }
      
      // Show success message
      alert('Avatar deleted successfully!')
      
    } catch (err) {
      setError(err.message || 'Failed to delete avatar. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const currentAvatar = user.avatar

  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h2 style={{ marginBottom: '2rem', color: '#333' }}>Update Avatar</h2>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '2rem' 
      }}>
        <div style={{ position: 'relative' }}>
          {previewUrl ? (
            <img 
              src={previewUrl}
              alt="Avatar"
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #25D366'
              }}
            />
          ) : currentAvatar ? (
            <img 
              src={currentAvatar}
              alt="Avatar"
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #25D366'
              }}
            />
          ) : (
            <div 
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#25D366',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                fontWeight: '600',
                border: '4px solid #25D366'
              }}
            >
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              background: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            📷
          </button>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {error && (
        <div style={{ 
          color: '#c33', 
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fee',
          borderRadius: '6px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}
      
      {selectedFile && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Selected: {selectedFile.name}
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="btn btn-primary"
              style={{ 
                width: 'auto',
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem'
              }}
            >
              {loading ? (
                <>
                  <span className="loading" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}></span>
                  Uploading...
                </>
              ) : (
                'Upload Avatar'
              )}
            </button>
            
            <button
              onClick={handleRemoveAvatar}
              disabled={loading}
              className="btn btn-secondary"
              style={{ 
                width: 'auto',
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {!selectedFile && (
        <div>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Click the camera icon to select a new avatar
          </p>
          
          {user.avatar && (
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                onClick={handleDeleteAvatar}
                disabled={loading}
                className="btn btn-secondary"
                style={{ 
                  width: 'auto',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9rem',
                  backgroundColor: '#dc3545',
                  borderColor: '#dc3545',
                  color: 'white'
                }}
              >
                {loading ? 'Deleting...' : 'Delete Current Avatar'}
              </button>
            </div>
          )}
          
          <div style={{ 
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#666'
          }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Supported formats:</strong> JPG, PNG, GIF
            </p>
            <p style={{ margin: '0' }}>
              <strong>Max size:</strong> 5MB
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AvatarUpload
