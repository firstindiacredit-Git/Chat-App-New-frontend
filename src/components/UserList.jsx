import React, { useState, useEffect } from 'react'
import { API_CONFIG } from '../config/mobileConfig'
import { Link, useNavigate } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import ContactSync from './ContactSync'
import { FcCheckmark } from "react-icons/fc";

const UserList = ({ user, onLogout }) => {
  const { isUserOnline } = useSocket()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalUsers, setTotalUsers] = useState(0)
  const [showContactSync, setShowContactSync] = useState(false)
  const [friendStatuses, setFriendStatuses] = useState({})
  const [loadingRequests, setLoadingRequests] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (users.length > 0) {
      fetchFriendStatuses()
    }
  }, [users])

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

  const handleViewProfile = (selectedUser, event) => {
    event.stopPropagation(); // Prevent the chat click handler
    navigate(`/profile/${selectedUser._id}`);
  }

  // Fetch friend statuses for all users
  const fetchFriendStatuses = async () => {
    try {
      const statusPromises = users.map(async (userData) => {
        const response = await fetch(`${API_CONFIG.API_URL}/friends/status/${userData._id}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        })
        const data = await response.json()
        return { userId: userData._id, status: data.success ? data.data.status : 'none', requestId: data.data?.requestId }
      })

      const statuses = await Promise.all(statusPromises)
      const statusMap = {}
      statuses.forEach(({ userId, status, requestId }) => {
        statusMap[userId] = { status, requestId }
      })
      setFriendStatuses(statusMap)
    } catch (error) {
      console.error('Error fetching friend statuses:', error)
    }
  }

  // Send friend request
  const sendFriendRequest = async (userId) => {
    try {
      setLoadingRequests(prev => ({ ...prev, [userId]: true }))
      const response = await fetch(`${API_CONFIG.API_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()
      
      if (data.success) {
        setFriendStatuses(prev => ({
          ...prev,
          [userId]: { status: 'sent', requestId: data.data.friendRequest._id }
        }))
      } else {
        alert(data.message || 'Failed to send friend request')
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Error sending friend request. Please try again.')
    } finally {
      setLoadingRequests(prev => ({ ...prev, [userId]: false }))
    }
  }

  // Accept friend request
  const acceptFriendRequest = async (userId, requestId) => {
    try {
      setLoadingRequests(prev => ({ ...prev, [userId]: true }))
      const response = await fetch(`${API_CONFIG.API_URL}/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })

      const data = await response.json()
      
      if (data.success) {
        setFriendStatuses(prev => ({
          ...prev,
          [userId]: { status: 'friend', requestId: null }
        }))
      } else {
        alert(data.message || 'Failed to accept friend request')
      }
    } catch (error) {
      console.error('Error accepting friend request:', error)
      alert('Error accepting friend request. Please try again.')
    } finally {
      setLoadingRequests(prev => ({ ...prev, [userId]: false }))
    }
  }

  // Reject friend request
  const rejectFriendRequest = async (userId, requestId) => {
    try {
      setLoadingRequests(prev => ({ ...prev, [userId]: true }))
      const response = await fetch(`${API_CONFIG.API_URL}/friends/reject/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })

      const data = await response.json()
      
      if (data.success) {
        setFriendStatuses(prev => ({
          ...prev,
          [userId]: { status: 'none', requestId: null }
        }))
      } else {
        alert(data.message || 'Failed to reject friend request')
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error)
      alert('Error rejecting friend request. Please try again.')
    } finally {
      setLoadingRequests(prev => ({ ...prev, [userId]: false }))
    }
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
              style={{ cursor: 'default' }}
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
              
              <div className="user-actions" style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                {/* Only show profile button for friends */}
                {friendStatuses[userData._id]?.status === 'friend' && (
                  <button
                    onClick={(e) => handleViewProfile(userData, e)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: '#f8f9fa',
                      color: '#666',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e9ecef';
                      e.target.style.color = '#495057';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.color = '#666';
                    }}
                    title="View Profile"
                  >
                    👤
                  </button>
                )}
                
                {/* Friend Request Actions */}
                {(() => {
                  const friendStatus = friendStatuses[userData._id];
                  const isLoading = loadingRequests[userData._id];
                  
                  if (!friendStatus) return null;
                  
                  switch (friendStatus.status) {
                    case 'friend':
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserClick(userData);
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#25D366',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#128C7E';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#25D366';
                          }}
                          title="Start Chat"
                        >
                          💬
                        </button>
                      );
                    
                    case 'sent':
                      return (
                        <button
                          disabled
                          style={{
                            padding: '5px 8px',
                            fontSize: '12px',
                            backgroundColor: 'gray',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'not-allowed',
                            opacity: 0.8
                          }}
                          title="Friend request sent"
                        >
                          📤 Sent
                        </button>
                      );
                    
                    case 'received':
                      return (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptFriendRequest(userData._id, friendStatus.requestId);
                            }}
                            disabled={isLoading}
                            style={{
                              padding: '6px 8px',
                              fontSize: '12px',
                              backgroundColor: 'white',
                              color: 'white',
                              border: '1px solid gray',
                              borderRadius: '6px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              opacity: isLoading ? 0.7 : 1
                            }}
                            title="Accept friend request"
                          >
                           <FcCheckmark />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rejectFriendRequest(userData._id, friendStatus.requestId);
                            }}
                            disabled={isLoading}
                            style={{
                              padding: '6px 8px',
                              fontSize: '12px',
                              backgroundColor: 'white',
                              color: 'white',
                              border: '1px solid gray',
                              borderRadius: '6px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              opacity: isLoading ? 0.7 : 1
                            }}
                            title="Reject friend request"
                          >
                            ❌
                          </button>
                        </div>
                      );
                    
                    default: // 'none'
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendFriendRequest(userData._id);
                          }}
                          disabled={isLoading}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: isLoading ? 0.7 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!isLoading) {
                              e.target.style.backgroundColor = '#0056b3';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isLoading) {
                              e.target.style.backgroundColor = '#007bff';
                            }
                          }}
                          title="Send friend request"
                        >
                          {isLoading ? '⏳' : '+ Add'}
                        </button>
                      );
                  }
                })()}
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
