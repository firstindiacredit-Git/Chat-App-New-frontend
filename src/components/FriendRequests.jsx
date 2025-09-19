import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/mobileConfig';
import { Link } from 'react-router-dom';

const FriendRequests = ({ user }) => {
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingRequests, setProcessingRequests] = useState({});

  useEffect(() => {
    fetchFriendRequests();
  }, []);

  const fetchFriendRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.API_URL}/friends/requests/received`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setFriendRequests(data.data.requests);
      } else {
        setError(data.message || 'Failed to fetch friend requests');
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      setError('Failed to fetch friend requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId, senderId) => {
    try {
      setProcessingRequests(prev => ({ ...prev, [requestId]: 'accepting' }));
      
      const response = await fetch(`${API_CONFIG.API_URL}/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove request from list
        setFriendRequests(prev => prev.filter(req => req._id !== requestId));
        alert(`Friend request accepted! You can now chat with ${data.data.newFriend.name}.`);
      } else {
        alert(data.message || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Error accepting friend request. Please try again.');
    } finally {
      setProcessingRequests(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRejectRequest = async (requestId, senderName) => {
    try {
      setProcessingRequests(prev => ({ ...prev, [requestId]: 'rejecting' }));
      
      const response = await fetch(`${API_CONFIG.API_URL}/friends/reject/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove request from list
        setFriendRequests(prev => prev.filter(req => req._id !== requestId));
      } else {
        alert(data.message || 'Failed to reject friend request');
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('Error rejecting friend request. Please try again.');
    } finally {
      setProcessingRequests(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  if (loading) {
    return (
      <div className="screen-container">
        <div className="chat-header">
          <Link to="/chat" className="back-btn" style={{ textDecoration: 'none', color: 'white' }}>
            ←
          </Link>
          <h3>Friend Requests</h3>
          <div style={{ width: '40px' }}></div>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          flexDirection: 'column'
        }}>
          <div className="loading" style={{ width: '40px', height: '40px' }}></div>
          <p style={{ marginTop: '1rem', color: '#666' }}>Loading friend requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div className="chat-header">
        <Link to="/chat" className="back-btn" style={{ textDecoration: 'none', color: 'white' }}>
          ←
        </Link>
        <h3>Friend Requests ({friendRequests.length})</h3>
        <div style={{ width: '40px' }}></div>
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

      <div className="friend-requests-list" style={{ 
        backgroundColor: 'white',
        minHeight: 'calc(100vh - 120px)'
      }}>
        {friendRequests.length === 0 ? (
          <div className="empty-state" style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#666'
          }}>
            <div style={{ 
              fontSize: '4rem', 
              marginBottom: '1rem'
            }}>👋</div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#333',
              marginBottom: '0.5rem'
            }}>No Friend Requests</h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#666',
              lineHeight: '1.5'
            }}>
              When someone sends you a friend request, it will appear here.
            </p>
          </div>
        ) : (
          friendRequests.map((request, index) => (
            <div 
              key={request._id} 
              className="friend-request-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: index === friendRequests.length - 1 ? 'none' : '1px solid #f0f0f0',
                backgroundColor: 'white'
              }}
            >
              {/* Sender Avatar */}
              <div style={{ position: 'relative', marginRight: '12px' }}>
                {request.sender.avatar ? (
                  <img 
                    src={request.sender.avatar}
                    alt={request.sender.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#c7c7c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    {request.sender.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              {/* Request Info */}
              <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <h4 style={{ 
                    margin: '0', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#262626'
                  }}>
                    {request.sender.name}
                  </h4>
                </div>
                
                <p style={{ 
                  margin: '0', 
                  fontSize: '14px', 
                  color: '#8e8e8e',
                  fontWeight: '400'
                }}>
                  wants to connect
                </p>
                
                {request.message && (
                  <p style={{ 
                    margin: '2px 0 0 0', 
                    fontSize: '12px', 
                    color: '#8e8e8e',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {request.message}
                  </p>
                )}
              </div>
              
              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => handleAcceptRequest(request._id, request.sender._id)}
                  disabled={processingRequests[request._id]}
                  style={{
                    padding: '6px 16px',
                    fontSize: '14px',
                    backgroundColor: '#0095f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: processingRequests[request._id] ? 'not-allowed' : 'pointer',
                    opacity: processingRequests[request._id] ? 0.7 : 1,
                    fontWeight: '600',
                    minWidth: '70px'
                  }}
                >
                  {processingRequests[request._id] === 'accepting' ? 'Loading...' : 'Confirm'}
                </button>
                
                <button
                  onClick={() => handleRejectRequest(request._id, request.sender.name)}
                  disabled={processingRequests[request._id]}
                  style={{
                    padding: '6px 16px',
                    fontSize: '14px',
                    backgroundColor: 'transparent',
                    color: '#262626',
                    border: '1px solid #dbdbdb',
                    borderRadius: '4px',
                    cursor: processingRequests[request._id] ? 'not-allowed' : 'pointer',
                    opacity: processingRequests[request._id] ? 0.7 : 1,
                    fontWeight: '600',
                    minWidth: '60px'
                  }}
                >
                  {processingRequests[request._id] === 'rejecting' ? 'Loading...' : 'Delete'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FriendRequests;
