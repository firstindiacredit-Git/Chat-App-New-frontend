import React, { useState } from 'react';
import { API_CONFIG } from '../config/mobileConfig';

const UserProfile = ({ user, currentUser, isVisible, onClose, onBlock }) => {
  const [isBlocking, setIsBlocking] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  if (!isVisible || !user) return null;

  const handleBlockUser = async () => {
    try {
      setIsBlocking(true);
      const response = await fetch(`${API_CONFIG.API_URL}/users/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ userId: user.id || user._id }),
      });

      const data = await response.json();
      
      if (data.success) {
        if (onBlock) {
          onBlock(user.id || user._id);
        }
        onClose();
      } else {
        console.error('Failed to block user:', data.message);
        alert('Failed to block user. Please try again.');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Error blocking user. Please try again.');
    } finally {
      setIsBlocking(false);
      setShowBlockConfirm(false);
    }
  };

  // Generate avatar initials if no avatar
  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Not available';
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={onClose}
      >
        {/* Profile Modal */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '0',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            animation: 'profileSlideIn 0.3s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            @keyframes profileSlideIn {
              from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>

          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #25D366, #128C7E)',
              padding: '20px',
              color: 'white',
              position: 'relative',
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
            <h2 style={{ 
              margin: '0', 
              fontSize: '20px', 
              fontWeight: '600',
              paddingRight: '50px'
            }}>
              User Profile
            </h2>
          </div>

          {/* Profile Content */}
          <div style={{ padding: '30px 20px' }}>
            {/* Avatar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '24px',
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid #25D366',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: '#25D366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    fontWeight: '600',
                    color: 'white',
                    border: '4px solid #25D366',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  {getAvatarInitials(user.name)}
                </div>
              )}
            </div>

            {/* User Name */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3
                style={{
                  margin: '0',
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '8px',
                }}
              >
                {user.name || 'Unknown User'}
              </h3>
              <div
                style={{
                  fontSize: '14px',
                  color: '#666',
                  backgroundColor: '#f5f5f5',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  display: 'inline-block',
                }}
              >
                User ID: {(user.id || user._id || '').toString().slice(-8)}
              </div>
            </div>

            {/* Phone Number */}
            <div
              style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                border: '1px solid #e9ecef',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#666',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}
              >
                Phone Number
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#333',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📞 {formatPhoneNumber(user.phone)}
              </div>
            </div>

            {/* Block Button */}
            <button
              onClick={() => setShowBlockConfirm(true)}
              disabled={isBlocking}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isBlocking ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                opacity: isBlocking ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isBlocking) {
                  e.target.style.backgroundColor = '#c82333';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isBlocking) {
                  e.target.style.backgroundColor = '#dc3545';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {isBlocking ? (
                <>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  Blocking...
                </>
              ) : (
                <>
                  🚫 Block User
                </>
              )}
            </button>
            
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* Block Confirmation Modal */}
      {showBlockConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowBlockConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '350px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: '#333',
              }}
            >
              Block User
            </h3>
            <p
              style={{
                margin: '0 0 24px 0',
                color: '#666',
                fontSize: '16px',
                lineHeight: '1.5',
              }}
            >
              Are you sure you want to block <strong>{user.name}</strong>? 
              You won't receive messages from this user anymore.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowBlockConfirm(false)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#adb5bd';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#ddd';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                disabled={isBlocking}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: isBlocking ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  opacity: isBlocking ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isBlocking) {
                    e.target.style.backgroundColor = '#c82333';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isBlocking) {
                    e.target.style.backgroundColor = '#dc3545';
                  }
                }}
              >
                {isBlocking ? 'Blocking...' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfile;
