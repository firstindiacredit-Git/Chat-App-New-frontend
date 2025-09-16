import React, { useState, useEffect } from 'react'
import { API_CONFIG } from '../config/mobileConfig'
import { useSocket } from '../contexts/SocketContext'

const ContactSync = ({ user, onBack, onUserSelect }) => {
  const { isUserOnline } = useSocket()
  const [contacts, setContacts] = useState([])
  const [foundUsers, setFoundUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle') // idle, syncing, completed
  const [inputMethod, setInputMethod] = useState('auto') // auto, manual, file
  const [manualPhones, setManualPhones] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      setIsMobile(isMobileDevice)
    }
    checkMobile()
  }, [])

  // Check if contacts API is available
  const isContactsAPIAvailable = () => {
    return 'contacts' in navigator && 'ContactsManager' in window
  }

  // Request contacts permission
  const requestContactsPermission = async () => {
    if (!isContactsAPIAvailable()) {
      setError('Contacts API is not available in this browser. Please use a supported browser.')
      return false
    }

    try {
      const permission = await navigator.permissions.query({ name: 'contacts' })
      
      if (permission.state === 'granted') {
        setPermissionGranted(true)
        return true
      } else if (permission.state === 'prompt') {
        // Try to access contacts to trigger permission prompt
        const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true })
        if (contacts && contacts.length > 0) {
          setPermissionGranted(true)
          return true
        }
      }
      
      setError('Contacts permission denied. Please allow access to contacts to sync.')
      return false
    } catch (err) {
      console.error('Error requesting contacts permission:', err)
      setError('Failed to request contacts permission. Please try again.')
      return false
    }
  }

  // Get contacts from device
  const getContacts = async () => {
    if (!isContactsAPIAvailable()) {
      setError('Contacts API is not available in this browser.')
      return []
    }

    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true })
      return contacts || []
    } catch (err) {
      console.error('Error getting contacts:', err)
      setError('Failed to get contacts. Please try again.')
      return []
    }
  }

  // Parse manual phone numbers
  const parseManualPhones = (phoneText) => {
    const lines = phoneText.split('\n').filter(line => line.trim())
    const phoneNumbers = []
    
    lines.forEach(line => {
      // Extract phone numbers from each line
      const matches = line.match(/\b\d{10,15}\b/g)
      if (matches) {
        phoneNumbers.push(...matches)
      }
    })
    
    return phoneNumbers
  }

  // Sync contacts with app users
  const syncContacts = async () => {
    setLoading(true)
    setError('')
    setSyncStatus('syncing')

    try {
      let phoneNumbers = []
      let deviceContacts = []

      if (inputMethod === 'manual') {
        // Use manually entered phone numbers
        phoneNumbers = parseManualPhones(manualPhones)
        
        if (phoneNumbers.length === 0) {
          setError('Please enter at least one valid phone number.')
          setLoading(false)
          setSyncStatus('idle')
          return
        }
      } else {
        // Use device contacts API
        deviceContacts = await getContacts()
        
        if (deviceContacts.length === 0) {
          setError('No contacts found on your device.')
          setLoading(false)
          setSyncStatus('idle')
          return
        }

        // Extract phone numbers from contacts
        deviceContacts.forEach(contact => {
          if (contact.tel && contact.tel.length > 0) {
            contact.tel.forEach(tel => {
              phoneNumbers.push(tel)
            })
          }
        })

        if (phoneNumbers.length === 0) {
          setError('No phone numbers found in your contacts.')
          setLoading(false)
          setSyncStatus('idle')
          return
        }
      }

      // Find users with matching phone numbers
      const response = await fetch(`${API_CONFIG.API_URL}/auth/find-users-by-phones`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumbers: phoneNumbers
        })
      })

      const data = await response.json()

      if (data.success) {
        setFoundUsers(data.data.foundUsers)
        setContacts(deviceContacts)
        setSyncStatus('completed')
      } else {
        setError(data.message || 'Failed to sync contacts')
        setSyncStatus('idle')
      }
    } catch (err) {
      console.error('Error syncing contacts:', err)
      setError('Failed to sync contacts. Please try again.')
      setSyncStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  // Start sync process
  const handleStartSync = async () => {
    if (inputMethod === 'auto' && !permissionGranted) {
      const granted = await requestContactsPermission()
      if (!granted) return
    }
    
    await syncContacts()
  }

  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '')
    
    // Format based on length
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    
    return phone // Return original if can't format
  }

  // Get contact name for a phone number
  const getContactName = (phoneNumber) => {
    const cleanedPhone = phoneNumber.replace(/\D/g, '')
    
    for (const contact of contacts) {
      if (contact.tel) {
        for (const tel of contact.tel) {
          const cleanedTel = tel.replace(/\D/g, '')
          if (cleanedTel === cleanedPhone || cleanedTel.endsWith(cleanedPhone) || cleanedPhone.endsWith(cleanedTel)) {
            return contact.name?.[0] || 'Unknown Contact'
          }
        }
      }
    }
    
    return 'Unknown Contact'
  }

  // Handle user selection
  const handleUserSelect = (selectedUser) => {
    if (onUserSelect) {
      onUserSelect(selectedUser)
    }
  }

  // Generate QR code data for sharing
  const generateQRData = () => {
    const shareData = {
      type: 'chatapp_contact',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      },
      app: 'ChatApp',
      timestamp: new Date().toISOString()
    }
    return JSON.stringify(shareData)
  }

  // Copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Copied to clipboard!')
    }
  }

  return (
    <div className="contact-sync-container">
      <div className="contact-sync-header">
        <button 
          className="back-btn"
          onClick={onBack}
        >
          ←
        </button>
        <h3>Sync Contacts</h3>
        <div style={{ width: '40px' }}></div>
      </div>

      <div className="contact-sync-content">
        {!isContactsAPIAvailable() && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <h4>Contacts API Not Available</h4>
            <p>Your browser doesn't support the Contacts API. This feature requires a modern browser with contacts access.</p>
            <p>Supported browsers: Chrome 80+, Edge 80+</p>
          </div>
        )}

        {syncStatus === 'idle' && (
          <div className="sync-intro">
            <div className="sync-icon">📱</div>
            <h3>Find Friends</h3>
            <p>Find friends who are already using this chat app by checking phone numbers.</p>
            <p>We'll only check which numbers are registered users - your data stays private.</p>
            
            {/* Input Method Selection */}
            <div className="input-method-selection">
              <h4>Choose how to find friends:</h4>
              
              <div className="method-options">
                {isContactsAPIAvailable() && (
                  <label className="method-option">
                    <input
                      type="radio"
                      name="inputMethod"
                      value="auto"
                      checked={inputMethod === 'auto'}
                      onChange={(e) => setInputMethod(e.target.value)}
                    />
                    <div className="method-content">
                      <div className="method-icon">📱</div>
                      <div>
                        <strong>Auto Sync</strong>
                        <p>Access your phone contacts automatically</p>
                        <small>Works on Chrome, Edge, Opera</small>
                      </div>
                    </div>
                  </label>
                )}
                
                <label className="method-option">
                  <input
                    type="radio"
                    name="inputMethod"
                    value="manual"
                    checked={inputMethod === 'manual'}
                    onChange={(e) => setInputMethod(e.target.value)}
                  />
                  <div className="method-content">
                    <div className="method-icon">✏️</div>
                    <div>
                      <strong>Manual Entry</strong>
                      <p>Enter phone numbers manually</p>
                      <small>Works on all devices</small>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Manual Input */}
            {inputMethod === 'manual' && (
              <div className="manual-input">
                <label htmlFor="phoneNumbers">
                  <strong>Enter phone numbers:</strong>
                </label>
                <textarea
                  id="phoneNumbers"
                  value={manualPhones}
                  onChange={(e) => setManualPhones(e.target.value)}
                  placeholder="Enter phone numbers, one per line:&#10;1234567890&#10;9876543210&#10;+1234567890"
                  rows={6}
                  className="phone-input"
                />
                <small>Enter 10-15 digit phone numbers, one per line</small>
              </div>
            )}

            {/* Mobile-specific message */}
            {isMobile && !isContactsAPIAvailable() && (
              <div className="mobile-notice">
                <div className="notice-icon">ℹ️</div>
                <p><strong>Mobile Browser Detected</strong></p>
                <p>Your mobile browser doesn't support automatic contact sync. Please use manual entry to find friends.</p>
              </div>
            )}
            
            <button 
              className="btn btn-primary sync-btn"
              onClick={handleStartSync}
              disabled={loading || (inputMethod === 'manual' && !manualPhones.trim())}
            >
              {loading ? 'Finding Friends...' : 
               inputMethod === 'manual' ? 'Find Friends' : 'Sync Contacts'}
            </button>

            {/* QR Code Sharing */}
            <div className="qr-sharing">
              <h4>Share Your Contact</h4>
              <p>Let others find you easily by sharing your contact info</p>
              
              <div className="share-options">
                <button 
                  className="btn btn-secondary share-btn"
                  onClick={() => setShowQRCode(!showQRCode)}
                >
                  {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
                </button>
                
                <button 
                  className="btn btn-secondary share-btn"
                  onClick={() => copyToClipboard(`${user.name} - ${user.phone}`)}
                >
                  Copy Contact Info
                </button>
              </div>

              {showQRCode && (
                <div className="qr-code-section">
                  <div className="qr-placeholder">
                    <div className="qr-icon">📱</div>
                    <p>QR Code for {user.name}</p>
                    <small>Scan to add contact</small>
                  </div>
                  <div className="qr-data">
                    <small>Contact Data:</small>
                    <code>{generateQRData()}</code>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="sync-loading">
            <div className="loading" style={{ width: '40px', height: '40px' }}></div>
            <h4>Syncing Contacts...</h4>
            <p>Finding friends who use this app</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <div className="error-icon">❌</div>
            <h4>Sync Failed</h4>
            <p>{error}</p>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setError('')
                setSyncStatus('idle')
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {syncStatus === 'completed' && (
          <div className="sync-results">
            <div className="sync-success">
              <div className="success-icon">✅</div>
              <h3>Sync Complete!</h3>
              <p>Found {foundUsers.length} friend{foundUsers.length !== 1 ? 's' : ''} from your contacts</p>
            </div>

            {foundUsers.length > 0 ? (
              <div className="found-users">
                <h4>Friends on ChatApp</h4>
                <div className="users-list">
                  {foundUsers.map(foundUser => (
                    <div 
                      key={foundUser._id}
                      className="user-item"
                      onClick={() => handleUserSelect(foundUser)}
                    >
                      <div className="user-avatar">
                        {foundUser.avatar ? (
                          <img src={foundUser.avatar} alt={foundUser.name} />
                        ) : (
                          <div className="default-avatar">
                            {foundUser.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        {isUserOnline(foundUser._id) && (
                          <div className="online-indicator-small"></div>
                        )}
                      </div>
                      <div className="user-info">
                        <h4>{foundUser.name}</h4>
                        <p>{getContactName(foundUser.phone)}</p>
                        <p className="phone-number">{formatPhoneNumber(foundUser.phone)}</p>
                        {foundUser.bio && (
                          <p className="user-bio">{foundUser.bio}</p>
                        )}
                      </div>
                      <div className="user-actions">
                        <button 
                          className="btn btn-primary chat-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUserSelect(foundUser)
                          }}
                        >
                          Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-friends">
                <div className="empty-icon">👥</div>
                <h4>No Friends Found</h4>
                <p>None of your contacts are using this chat app yet.</p>
                <p>Invite them to join!</p>
              </div>
            )}

            <div className="sync-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSyncStatus('idle')
                  setFoundUsers([])
                  setContacts([])
                }}
              >
                Sync Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContactSync
