import React, { useState, useEffect } from 'react'
import { API_CONFIG } from '../config/mobileConfig'
import { Link, useNavigate } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import ContactSync from './ContactSync'

const UserList = ({ user, onLogout }) => {
  const { isUserOnline } = useSocket()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalUsers, setTotalUsers] = useState(0)
  const [showContactSync, setShowContactSync] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_CONFIG.API_URL}/auth/users`)
      const data = await response.json()

      if (data.success) {
        // Filter out the current user from the list
        const otherUsers = data.data.users.filter(userData => userData._id !== user.id)
        setUsers(otherUsers)
        setTotalUsers(otherUsers.length)
      } else {
        setError(data.message || 'Failed to fetch users')
      }
    } catch (err) {
      setError('Failed to fetch users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUserClick = (selectedUser) => {
    // Create a chat object for the selected user
    const chatData = {
      id: selectedUser._id,
      name: selectedUser.name || 'User',
      avatar: selectedUser.avatar || '', // Will be handled by default avatar logic
      lastMessage: '',
      time: '',
      unread: 0,
      online: true
    }
    
    // Store the selected chat in localStorage for the Chat component to use
    localStorage.setItem('selectedChat', JSON.stringify(chatData))
    
    // Navigate to chat page
    navigate('/chat')
  }

  const handleContactSyncUserSelect = (selectedUser) => {
    // Same logic as handleUserClick but for users found through contact sync
    handleUserClick(selectedUser)
  }

  // Show contact sync component if requested
  if (showContactSync) {
    return (
      <ContactSync 
        user={user}
        onBack={() => setShowContactSync(false)}
        onUserSelect={handleContactSyncUserSelect}
      />
    )
  }

  if (loading) {
    return (
      <div className="screen-container">
        <div className="chat-header">
          <h3>Registered Users</h3>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh',
          flexDirection: 'column'
        }}>
          <div className="loading" style={{ width: '40px', height: '40px' }}></div>
          <p style={{ marginTop: '1rem', color: '#666' }}>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-container">
        <div className="chat-header">
          <Link to="/chat" className="back-btn" style={{ textDecoration: 'none', color: 'white' }}>
            ←
          </Link>
          <h3>Other Users ({totalUsers})</h3>
          <button 
            className="sync-contacts-btn"
            onClick={() => setShowContactSync(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
            title="Sync Contacts"
          >
            📱
          </button>
        </div>
      
      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee', 
          color: '#c33', 
          textAlign: 'center',
          margin: '1rem',
          borderRadius: '8px'
        }}>
          {error}
        </div>
      )}

      <div className="users-list">
        {users.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem',
            color: '#666'
          }}>
            <p>No other users found.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Be the first to invite others to join!
            </p>
          </div>
        ) : (
          users.map((userData, index) => (
            <div 
              key={userData._id || index} 
              className="user-item"
              onClick={() => handleUserClick(userData)}
              style={{ cursor: 'pointer' }}
            >
              <div className="user-avatar">
                {userData.avatar ? (
                  <img 
                    src={userData.avatar}
                    alt={userData.name}
                  />
                ) : (
                  <div className="default-avatar">
                    {userData.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              <div className="user-content">
                <h4>{userData.name}</h4>
                <p style={{ 
                  margin: '0.25rem 0 0 0', 
                  fontSize: '0.875rem', 
                  color: isUserOnline(userData._id) ? '#25D366' : '#999',
                  fontWeight: '500'
                }}>
                  {isUserOnline(userData._id) ? 'online' : 'last seen recently'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ 
        padding: '1rem', 
        textAlign: 'center', 
        backgroundColor: 'white',
        borderTop: '1px solid #e1e5e9'
      }}>
        <Link 
          to="/chat" 
          className="btn btn-primary"
          style={{ 
            textDecoration: 'none', 
            display: 'inline-block',
            width: 'auto',
            padding: '0.75rem 2rem'
          }}
        >
          Back to Chat
        </Link>
      </div>
    </div>
  )
}

export default UserList
