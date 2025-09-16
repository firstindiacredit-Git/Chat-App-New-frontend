import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { API_CONFIG } from '../config/mobileConfig';

const CallHistory = ({ user, onBack }) => {
  const { socket, isConnected } = useSocket();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, voice, video, missed, answered
  const [selectedCall, setSelectedCall] = useState(null);
  const [showCallDetails, setShowCallDetails] = useState(false);

  // Fetch call history
  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.API_URL}/calls/history`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setCalls(data.data.calls);
      } else {
        console.error('Failed to fetch call history:', data.message);
        setCalls([]);
      }
    } catch (error) {
      console.error('Error fetching call history:', error);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallHistory();
  }, []);

  // Filter calls based on selected filter
  const filteredCalls = calls.filter(call => {
    switch (filter) {
      case 'voice':
        return call.callType === 'voice';
      case 'video':
        return call.callType === 'video';
      case 'missed':
        return call.status === 'missed';
      case 'answered':
        return call.status === 'answered';
      default:
        return true;
    }
  });

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Get call status icon and color
  const getCallStatusInfo = (call) => {
    const isOutgoing = call.isCaller;
    
    switch (call.status) {
      case 'answered':
        return {
          icon: isOutgoing ? '📞' : '📞',
          color: '#25D366',
          text: isOutgoing ? 'Outgoing' : 'Incoming',
        };
      case 'missed':
        return {
          icon: isOutgoing ? '📞❌' : '📞❌',
          color: '#ff4444',
          text: isOutgoing ? 'Missed' : 'Missed',
        };
      case 'declined':
        return {
          icon: '📞🚫',
          color: '#ff8800',
          text: 'Declined',
        };
      case 'ended':
        return {
          icon: '📞✅',
          color: '#25D366',
          text: 'Ended',
        };
      default:
        return {
          icon: '📞',
          color: '#666',
          text: 'Unknown',
        };
    }
  };

  // Handle call back
  const handleCallBack = (call) => {
    // This will be implemented when we add the calling functionality
    console.log('Call back to:', call.otherUser);
    // For now, just show an alert
    alert(`Call back functionality will be implemented for ${call.otherUser.name}`);
  };

  // Handle delete call
  const handleDeleteCall = async (callId) => {
    if (!window.confirm('Are you sure you want to delete this call from history?')) {
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.API_URL}/calls/${callId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setCalls(prev => prev.filter(call => call._id !== callId));
        alert('Call deleted successfully');
      } else {
        alert(data.message || 'Failed to delete call');
      }
    } catch (error) {
      console.error('Error deleting call:', error);
      alert('Failed to delete call');
    }
  };

  // Handle view call details
  const handleViewDetails = async (callId) => {
    try {
      const response = await fetch(`${API_CONFIG.API_URL}/calls/${callId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSelectedCall(data.data.call);
        setShowCallDetails(true);
      } else {
        alert(data.message || 'Failed to fetch call details');
      }
    } catch (error) {
      console.error('Error fetching call details:', error);
      alert('Failed to fetch call details');
    }
  };

  if (showCallDetails && selectedCall) {
    return (
      <div className="call-details-container">
        <div className="call-details-header">
          <button 
            className="back-btn"
            onClick={() => setShowCallDetails(false)}
          >
            ←
          </button>
          <h3>Call Details</h3>
          <div style={{ width: '40px' }}></div>
        </div>
        
        <div className="call-details-content">
          <div className="call-details-info">
            <div className="call-user-info">
              <div className="call-user-avatar">
                {selectedCall.otherUser.avatar ? (
                  <img src={selectedCall.otherUser.avatar} alt={selectedCall.otherUser.name} />
                ) : (
                  <div className="default-avatar-large">
                    {selectedCall.otherUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="call-user-details">
                <h2>{selectedCall.otherUser.name}</h2>
                <p>{selectedCall.otherUser.phone || selectedCall.otherUser.email}</p>
                <div className="call-type-badge">
                  {selectedCall.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
                </div>
              </div>
            </div>

            <div className="call-stats">
              <div className="call-stat">
                <span className="stat-label">Status</span>
                <span className="stat-value" style={{ color: getCallStatusInfo(selectedCall).color }}>
                  {getCallStatusInfo(selectedCall).text}
                </span>
              </div>
              <div className="call-stat">
                <span className="stat-label">Duration</span>
                <span className="stat-value">{formatDuration(selectedCall.duration)}</span>
              </div>
              <div className="call-stat">
                <span className="stat-label">Date</span>
                <span className="stat-value">{new Date(selectedCall.startTime).toLocaleString()}</span>
              </div>
            </div>

            {selectedCall.notes && (
              <div className="call-notes">
                <h4>Notes</h4>
                <p>{selectedCall.notes}</p>
              </div>
            )}
          </div>

          <div className="call-details-actions">
            <button 
              className="btn btn-primary"
              onClick={() => handleCallBack(selectedCall)}
            >
              📞 Call Back
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowCallDetails(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="call-history-container">
      <div className="call-history-header">
        <button 
          className="back-btn"
          onClick={onBack}
        >
          ←
        </button>
        <h3>Call History</h3>
        <div style={{ width: '40px' }}></div>
      </div>

      {/* Filter buttons */}
      <div className="call-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${filter === 'voice' ? 'active' : ''}`}
          onClick={() => setFilter('voice')}
        >
          📞 Voice
        </button>
        <button 
          className={`filter-btn ${filter === 'video' ? 'active' : ''}`}
          onClick={() => setFilter('video')}
        >
          📹 Video
        </button>
        <button 
          className={`filter-btn ${filter === 'missed' ? 'active' : ''}`}
          onClick={() => setFilter('missed')}
        >
          ❌ Missed
        </button>
        <button 
          className={`filter-btn ${filter === 'answered' ? 'active' : ''}`}
          onClick={() => setFilter('answered')}
        >
          ✅ Answered
        </button>
      </div>

      {/* Call list */}
      <div className="call-list">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading call history...</p>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📞</div>
            <h3>No calls found</h3>
            <p>Your call history will appear here</p>
          </div>
        ) : (
          filteredCalls.map(call => {
            const statusInfo = getCallStatusInfo(call);
            return (
              <div key={call._id} className="call-item">
                <div className="call-avatar">
                  {call.otherUser.avatar ? (
                    <img src={call.otherUser.avatar} alt={call.otherUser.name} />
                  ) : (
                    <div className="default-avatar">
                      {call.otherUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                
                <div className="call-content">
                  <div className="call-info">
                    <h4>{call.otherUser.name}</h4>
                    <div className="call-meta">
                      <span className="call-type">
                        {call.callType === 'video' ? '📹' : '📞'}
                      </span>
                      <span className="call-status" style={{ color: statusInfo.color }}>
                        {statusInfo.text}
                      </span>
                      {call.duration > 0 && (
                        <span className="call-duration">
                          {formatDuration(call.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="call-time">
                    {formatDate(call.startTime)}
                  </div>
                </div>

                <div className="call-actions">
                  <button 
                    className="action-btn"
                    onClick={() => handleCallBack(call)}
                    title="Call Back"
                  >
                    📞
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => handleViewDetails(call._id)}
                    title="View Details"
                  >
                    ℹ️
                  </button>
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteCall(call._id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CallHistory;
