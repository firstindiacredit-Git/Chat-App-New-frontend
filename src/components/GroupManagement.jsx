import React, { useState, useEffect } from 'react'
import { API_CONFIG } from '../config/mobileConfig'
import { useSocket } from '../contexts/SocketContext'

const GroupManagement = ({ user, onBack, onGroupSelect }) => {
  const { isUserOnline } = useSocket()
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [showGroupDetails, setShowGroupDetails] = useState(false)
  const [error, setError] = useState('')
  const [groupSearchQuery, setGroupSearchQuery] = useState('')
  const [filteredGroups, setFilteredGroups] = useState([])

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    selectedUsers: []
  })

  useEffect(() => {
    fetchGroups()
    fetchUsers()
  }, [])

  // Filter groups based on search query
  useEffect(() => {
    if (groupSearchQuery.trim()) {
      const filtered = groups.filter(group =>
        group.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(groupSearchQuery.toLowerCase())
      )
      setFilteredGroups(filtered)
    } else {
      setFilteredGroups(groups)
    }
  }, [groups, groupSearchQuery])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_CONFIG.API_URL}/groups`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        setGroups(data.data.groups)
      } else {
        setError(data.message || 'Failed to fetch groups')
      }
    } catch (err) {
      setError('Failed to fetch groups. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_CONFIG.API_URL}/auth/users`)
      const data = await response.json()

      if (data.success) {
        const otherUsers = data.data.users.filter(userData => userData._id !== user.id)
        setUsers(otherUsers)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    
    if (!createForm.name.trim()) {
      setError('Group name is required')
      return
    }

    try {
      const response = await fetch(`${API_CONFIG.API_URL}/groups/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          memberIds: createForm.selectedUsers
        })
      })

      const data = await response.json()

      if (data.success) {
        setGroups(prev => [data.data.group, ...prev])
        setShowCreateGroup(false)
        setCreateForm({ name: '', description: '', selectedUsers: [] })
        setError('')
      } else {
        setError(data.message || 'Failed to create group')
      }
    } catch (err) {
      setError('Failed to create group. Please try again.')
    }
  }

  const handleUserToggle = (userId) => {
    setCreateForm(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }))
  }

  const handleGroupClick = (group) => {
    if (onGroupSelect) {
      onGroupSelect(group)
    }
  }

  const handleLeaveGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to leave this group?')) {
      return
    }

    try {
      const response = await fetch(`${API_CONFIG.API_URL}/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        // Don't remove group from local state to prevent removal from chats tab
        // setGroups(prev => prev.filter(group => group._id !== groupId))
        setShowGroupDetails(false)
        setSelectedGroup(null)
      } else {
        setError(data.message || 'Failed to leave group')
      }
    } catch (err) {
      setError('Failed to leave group. Please try again.')
    }
  }

  if (showCreateGroup) {
    return (
      <div className="group-management-container">
        <div className="group-header">
          <button 
            className="back-btn"
            onClick={() => setShowCreateGroup(false)}
          >
            ←
          </button>
          <h3>Create Group</h3>
          <div style={{ width: '40px' }}></div>
        </div>

        <div className="create-group-content">
          <form onSubmit={handleCreateGroup} className="create-group-form">
            <div className="form-group">
              <label htmlFor="groupName">Group Name *</label>
              <input
                type="text"
                id="groupName"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter group name"
                maxLength={50}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="groupDescription">Description (Optional)</label>
              <textarea
                id="groupDescription"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter group description"
                maxLength={200}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Add Members</label>
              <div className="users-selection">
                {users.map(userData => (
                  <div 
                    key={userData._id}
                    className={`user-selection-item ${createForm.selectedUsers.includes(userData._id) ? 'selected' : ''}`}
                    onClick={() => handleUserToggle(userData._id)}
                  >
                    <div className="user-avatar">
                      {userData.avatar ? (
                        <img src={userData.avatar} alt={userData.name} />
                      ) : (
                        <div className="default-avatar">
                          {userData.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <h4>{userData.name}</h4>
                      <p>{userData.phone || userData.email}</p>
                    </div>
                    <div className="selection-indicator">
                      {createForm.selectedUsers.includes(userData._id) ? '✓' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="error-message">{error}</div>
            )}

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowCreateGroup(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Group
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (showGroupDetails && selectedGroup) {
    return (
      <div className="group-management-container">
        <div className="group-header">
          <div style={{ width: '40px' }}></div>
          <h3>Group Info</h3>
          <button 
            className="close-btn"
            onClick={() => {
              setShowGroupDetails(false)
              setSelectedGroup(null)
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="group-details-content">
          <div className="group-info">
            <div className="group-avatar">
              {selectedGroup.avatar ? (
                <img src={selectedGroup.avatar} alt={selectedGroup.name} />
              ) : (
                <div className="default-avatar-large">
                  {selectedGroup.name?.charAt(0)?.toUpperCase() || 'G'}
                </div>
              )}
            </div>
            <h2>{selectedGroup.name}</h2>
            {selectedGroup.description && (
              <p className="group-description">{selectedGroup.description}</p>
            )}
            <p className="group-meta">
              Created by {selectedGroup.createdBy?.name}
            </p>
            <p className="group-meta">
              {selectedGroup.members?.length} members
            </p>
            <p className="group-meta">
              Created on {new Date(selectedGroup.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="group-members">
            <h3>Members ({selectedGroup.members?.length || 0})</h3>
            <div className="members-list">
              {selectedGroup.members?.map(member => (
                <div key={member._id} className="member-item">
                  <div className="member-avatar">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} />
                    ) : (
                      <div className="default-avatar">
                        {member.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    {isUserOnline(member._id) && (
                      <div className="online-indicator-small"></div>
                    )}
                  </div>
                  <div className="member-info">
                    <h4>
                      {member.name}
                      {selectedGroup.createdBy?._id === member._id && (
                        <span className="creator-badge">Creator</span>
                      )}
                      {selectedGroup.admins?.some(admin => admin._id === member._id) && selectedGroup.createdBy?._id !== member._id && (
                        <span className="admin-badge">Admin</span>
                      )}
                    </h4>
                    <p>{member.phone || member.email}</p>
                    <p className="member-status-text">
                      {isUserOnline(member._id) ? (
                        <span className="online-status">Online</span>
                      ) : (
                        <span className="offline-status">Last seen recently</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="group-actions">
            <button 
              className="btn btn-primary"
              onClick={() => handleGroupClick(selectedGroup)}
            >
              Open Chat
            </button>
            {selectedGroup.createdBy?._id !== user.id && (
              <button 
                className="btn btn-danger"
                onClick={() => handleLeaveGroup(selectedGroup._id)}
              >
                Leave Group
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="group-management-container">
        <div className="group-header">
          <div style={{ width: '40px' }}></div>
          <h3>Groups</h3>
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
          <p style={{ marginTop: '1rem', color: '#666' }}>Loading groups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="group-management-container">
      <div className="group-header">
        <div className="group-search-container" style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 8px'
        }}>
          {/* Group Search Bar */}
          <div style={{
            flex: 1,
            backgroundColor: '#f3f4f6',
            borderRadius: '20px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <span style={{ 
              color: '#6b7280', 
              fontSize: '14px' 
            }}>🔍</span>
            <input
              type="text"
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder={`Search ${groups.length} groups...`}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: '#374151'
              }}
            />
            {groupSearchQuery && (
              <button
                onClick={() => setGroupSearchQuery('')}
                style={{
                  color: '#6b7280',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '50%',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Create Group Button */}
          <button 
            className="create-group-btn"
            onClick={() => setShowCreateGroup(true)}
            title="Create Group"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#25D366',
              color: 'white',
              border: 'none',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#128C7E';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#25D366';
              e.target.style.transform = 'scale(1)';
            }}
          >
            +
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Search Results Info */}
      {groupSearchQuery && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e9ecef',
          fontSize: '12px',
          color: '#6c757d',
          textAlign: 'center'
        }}>
          {filteredGroups.length > 0 ? (
            `Found ${filteredGroups.length} group${filteredGroups.length !== 1 ? 's' : ''} matching "${groupSearchQuery}"`
          ) : (
            `No groups found for "${groupSearchQuery}"`
          )}
        </div>
      )}

      <div className="groups-list">
        {filteredGroups.length === 0 ? (
          groupSearchQuery ? (
            // No search results
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No Groups Found</h3>
              <p>No groups match "{groupSearchQuery}"</p>
              <button 
                onClick={() => setGroupSearchQuery('')}
                className="btn btn-secondary"
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Clear Search
              </button>
            </div>
          ) : groups.length === 0 ? (
            // No groups at all
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No Groups Yet</h3>
              <p>Create your first group to start group conversations</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateGroup(true)}
                style={{
                  marginTop: '12px',
                  padding: '12px 24px',
                  backgroundColor: '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Create Group
              </button>
            </div>
          ) : null
        ) : (
          filteredGroups.map(group => (
            <div 
              key={group._id} 
              className="group-item"
              onClick={() => handleGroupClick(group)}
            >
              <div className="group-avatar">
                {group.avatar ? (
                  <img src={group.avatar} alt={group.name} />
                ) : (
                  <div className="default-avatar">
                    {group.name?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                )}
                <div className="group-indicator" title="Group Chat">👥</div>
              </div>
              
              <div className="group-content">
                <div className="group-info">
                  <h4>
                    {group.name}
                    <span className="group-badge">Group</span>
                  </h4>
                  <span className="group-time">
                    {group.lastActivity ? 
                      new Date(group.lastActivity).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      }) : 
                      ''
                    }
                  </span>
                </div>
                <div className="group-preview">
                  <p>
                    {group.lastMessage ? 
                      (group.lastMessage.messageType === 'system' ? 
                        group.lastMessage.content : 
                        `${group.lastMessage.sender?.name}: ${group.lastMessage.content}`
                      ) : 
                      'No messages yet'
                    }
                  </p>
                  {group.unreadCount > 0 && (
                    <span 
                      className="unread-badge" 
                      title={`${group.unreadCount} unread message${group.unreadCount > 1 ? 's' : ''}`}
                    >
                      {group.unreadCount > 99 ? '99+' : group.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default GroupManagement
