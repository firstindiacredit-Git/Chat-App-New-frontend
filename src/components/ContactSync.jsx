import React, { useState, useEffect } from 'react'
import { API_CONFIG } from '../config/mobileConfig'
import { useSocket } from '../contexts/SocketContext'
import MobileLayout from './MobileLayout'
import { 
  isMobilePlatform, 
  getDeviceInfo, 
  requestContactsPermission, 
  getDeviceContacts,
  showPermissionExplanation,
  formatPermissionsStatus
} from '../utils/mobilePermissions'

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
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)

  // Detect mobile device and get device info
  useEffect(() => {
    const initMobileCheck = async () => {
      const isMobileDevice = isMobilePlatform() || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent)
      setIsMobile(isMobileDevice)
      
      if (isMobileDevice) {
        const info = await getDeviceInfo()
        setDeviceInfo(info)
      }
    }
    initMobileCheck()
  }, [])

  // Check if contacts API is available
  const isContactsAPIAvailable = () => {
    return 'contacts' in navigator && 'ContactsManager' in window
  }

  // Request contacts permission using mobile utilities
  const requestContactsPermissionMobile = async () => {
    try {
      const result = await requestContactsPermission()
      
      if (result.granted) {
        setPermissionGranted(true)
        return true
      } else {
        setError(result.message)
        return false
      }
    } catch (err) {
      console.error('Error requesting contacts permission:', err)
      setError('Failed to request contacts permission. Please try again.')
      return false
    }
  }

  // Get contacts from device using mobile utilities
  const getContactsMobile = async () => {
    try {
      const result = await getDeviceContacts()
      
      if (result.success) {
        return result.contacts.map(contact => ({
          name: [contact.name],
          tel: contact.phoneNumbers
        }))
      } else {
        setError(result.message)
        return []
      }
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
        deviceContacts = await getContactsMobile()
        
        if (deviceContacts.length === 0) {
          setError('No contacts found on your device or contacts access failed. Please try manual entry.')
          setInputMethod('manual')
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

  // Show permission explanation dialog
  const showPermissionExplanationDialog = () => {
    const explanation = showPermissionExplanation()
    setShowPermissionDialog(true)
    return explanation
  }

  // Start sync process
  const handleStartSync = async () => {
    if (inputMethod === 'auto' && !permissionGranted) {
      const granted = await requestContactsPermissionMobile()
      if (!granted) {
        // If permission failed, automatically switch to manual mode
        setInputMethod('manual')
        setError('Contacts permission not available. Please enter phone numbers manually.')
        return
      }
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
    <MobileLayout 
      title="Sync Contacts"
      showBackButton={true}
      onBackClick={onBack}
    >
      <div className="contact-sync-content">
        {/* Device Info Display */}
        {isMobile && deviceInfo && (
          <div className="device-info">
            <div className="device-icon">📱</div>
            <p><strong>Device:</strong> {deviceInfo.model} ({deviceInfo.platform})</p>
            {deviceInfo.osVersion && (
              <p><strong>OS:</strong> {deviceInfo.operatingSystem} {deviceInfo.osVersion}</p>
            )}
          </div>
        )}

        {/* Permission Dialog */}
        {showPermissionDialog && (
          <div className="permission-dialog">
            <div className="dialog-content">
              <h4>📱 Permissions Required</h4>
              <p>This app needs access to your contacts to find friends who are using ChatApp.</p>
              <div className="permission-list">
                <div className="permission-item">
                  <span className="permission-icon">📱</span>
                  <div>
                    <strong>Contacts</strong>
                    <p>Find friends who are using this app</p>
                  </div>
                </div>
              </div>
              <div className="dialog-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowPermissionDialog(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={async () => {
                    setShowPermissionDialog(false)
                    await handleStartSync()
                  }}
                >
                  Grant Permission
                </button>
              </div>
            </div>
          </div>
        )}

        {!isMobile && !isContactsAPIAvailable() && (
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
                {(isMobile || isContactsAPIAvailable()) && (
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
                        <strong>{isMobile ? 'Mobile Sync' : 'Auto Sync'}</strong>
                        <p>{isMobile ? 'Access your phone contacts' : 'Access your browser contacts'}</p>
                        <small>{isMobile ? 'Native mobile app' : 'Works on Chrome, Edge, Opera'}</small>
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
            {isMobile && !isContactsAPIAvailable() && inputMethod === 'auto' && (
              <div className="mobile-notice">
                <div className="notice-icon">ℹ️</div>
                <p><strong>Contact Sync Information</strong></p>
                <p>If automatic contact sync doesn't work, please try:</p>
                <ul style={{ textAlign: 'left', marginTop: '0.5rem' }}>
                  <li>Enable contacts permission in device settings</li>
                  <li>Restart the app and try again</li>
                  <li>Use manual entry as an alternative</li>
                </ul>
              </div>
            )}

            {/* Error handling with helpful suggestions */}
            {error && (
              <div className="error-message-detailed">
                <div className="error-icon">⚠️</div>
                <h4>Sync Issue</h4>
                <p>{error}</p>
                <div className="error-suggestions">
                  <p><strong>Try these solutions:</strong></p>
                  <ul>
                    <li>Check if contacts permission is enabled in device settings</li>
                    <li>Restart the app and try again</li>
                    <li>Use manual phone number entry below</li>
                  </ul>
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setError('')
                    setInputMethod('manual')
                  }}
                >
                  Switch to Manual Entry
                </button>
              </div>
            )}
            
            <button 
              className="btn btn-primary sync-btn"
              onClick={() => {
                if (isMobile && inputMethod === 'auto' && !permissionGranted) {
                  showPermissionExplanationDialog()
                } else {
                  handleStartSync()
                }
              }}
              disabled={loading || (inputMethod === 'manual' && !manualPhones.trim())}
            >
              {loading ? 'Finding Friends...' : 
               inputMethod === 'manual' ? 'Find Friends' : 
               isMobile ? 'Sync Contacts' : 'Sync Contacts'}
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

        {error && syncStatus !== 'idle' && (
          <div className="error-message">
            <div className="error-icon">❌</div>
            <h4>Sync Failed</h4>
            <p>{error}</p>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setError('')
                setSyncStatus('idle')
                setInputMethod('manual')
              }}
            >
              Try Manual Entry
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
    </MobileLayout>
  )
}

export default ContactSync
