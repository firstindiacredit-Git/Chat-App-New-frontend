import React, { useState, useEffect } from 'react'
import { 
  isMobilePlatform, 
  getDeviceInfo, 
  requestAllPermissions,
  checkPermissions,
  formatPermissionsStatus
} from '../utils/mobilePermissions'

const MobilePermissions = ({ onPermissionsGranted, onSkip }) => {
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [permissionStatus, setPermissionStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [step, setStep] = useState('intro') // intro, requesting, completed

  useEffect(() => {
    const initializePermissions = async () => {
      if (isMobilePlatform()) {
        const info = await getDeviceInfo()
        setDeviceInfo(info)
        
        // Check if permissions are already granted
        const status = await checkPermissions()
        setPermissionStatus(status)
        
        if (status.allGranted) {
          setStep('completed')
          setTimeout(() => {
            onPermissionsGranted(status)
          }, 1500)
        }
      }
    }
    
    initializePermissions()
  }, [onPermissionsGranted])

  const handleRequestPermissions = async () => {
    setIsLoading(true)
    setStep('requesting')
    
    try {
      const result = await requestAllPermissions()
      setPermissionStatus(result)
      
      setTimeout(() => {
        setStep('completed')
        setIsLoading(false)
        
        if (result.allGranted) {
          setTimeout(() => {
            onPermissionsGranted(result)
          }, 1500)
        }
      }, 2000)
    } catch (error) {
      console.error('Error requesting permissions:', error)
      setIsLoading(false)
      setStep('intro')
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  if (!isMobilePlatform()) {
    // Not a mobile platform, skip permissions
    useEffect(() => {
      onSkip()
    }, [onSkip])
    return null
  }

  return (
    <div className="mobile-permissions-container">
      <div className="permissions-content">
        {step === 'intro' && (
          <>
            <div className="permissions-header">
              <div className="app-icon">📱</div>
              <h2>Welcome to ChatApp!</h2>
              {deviceInfo && (
                <p className="device-info">
                  Running on {deviceInfo.model} ({deviceInfo.platform} {deviceInfo.osVersion})
                </p>
              )}
            </div>

            <div className="permissions-explanation">
              <h3>🔒 App Permissions</h3>
              <p>To provide you with the best experience, ChatApp needs access to:</p>
              
              <div className="permission-list">
                <div className="permission-item">
                  <div className="permission-icon">📷</div>
                  <div className="permission-details">
                    <h4>Camera</h4>
                    <p>Take photos and videos to share with friends</p>
                  </div>
                </div>
                
                <div className="permission-item">
                  <div className="permission-icon">💾</div>
                  <div className="permission-details">
                    <h4>Storage</h4>
                    <p>Save and access media files on your device</p>
                  </div>
                </div>
                
                <div className="permission-item">
                  <div className="permission-icon">📱</div>
                  <div className="permission-details">
                    <h4>Contacts</h4>
                    <p>Find friends who are already using ChatApp</p>
                  </div>
                </div>
              </div>

              <div className="privacy-notice">
                <div className="privacy-icon">🔐</div>
                <p><strong>Your Privacy Matters</strong></p>
                <p>We only use these permissions for app functionality. Your data stays private and secure.</p>
              </div>
            </div>

            <div className="permissions-actions">
              <button 
                className="btn btn-primary permissions-btn"
                onClick={handleRequestPermissions}
                disabled={isLoading}
              >
                Grant Permissions
              </button>
              
              <button 
                className="btn btn-secondary skip-btn"
                onClick={handleSkip}
              >
                Skip for Now
              </button>
              
              <button 
                className="btn btn-link details-btn"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'More Details'}
              </button>
            </div>

            {showDetails && (
              <div className="permission-details-expanded">
                <h4>Detailed Permission Information</h4>
                <div className="detail-item">
                  <strong>Camera Permission:</strong>
                  <p>Allows the app to take photos and record videos for sharing in chats. You can revoke this permission anytime in your device settings.</p>
                </div>
                <div className="detail-item">
                  <strong>Storage Permission:</strong>
                  <p>Enables the app to save received media files and access files from your device for sharing. This permission is required for media functionality.</p>
                </div>
                <div className="detail-item">
                  <strong>Contacts Permission:</strong>
                  <p>Helps you find friends who are already using ChatApp by matching phone numbers. Contact data is processed securely and not stored on our servers.</p>
                </div>
              </div>
            )}
          </>
        )}

        {step === 'requesting' && (
          <div className="permissions-loading">
            <div className="loading-animation">
              <div className="loading-spinner"></div>
            </div>
            <h3>Requesting Permissions...</h3>
            <p>Please allow access when prompted by your device</p>
            <div className="loading-steps">
              <div className="loading-step">📷 Camera Access</div>
              <div className="loading-step">💾 Storage Access</div>
              <div className="loading-step">📱 Contacts Access</div>
            </div>
          </div>
        )}

        {step === 'completed' && (
          <div className="permissions-completed">
            {permissionStatus?.allGranted ? (
              <>
                <div className="success-icon">✅</div>
                <h3>All Set!</h3>
                <p>Permissions granted successfully</p>
                <p>Welcome to ChatApp! 🎉</p>
              </>
            ) : (
              <>
                <div className="warning-icon">⚠️</div>
                <h3>Some Permissions Denied</h3>
                <p>You can still use the app, but some features may be limited.</p>
                {permissionStatus && (
                  <div className="permission-status">
                    <h4>Permission Status:</h4>
                    <pre>{formatPermissionsStatus(permissionStatus)}</pre>
                  </div>
                )}
                <div className="permissions-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={() => onPermissionsGranted(permissionStatus)}
                  >
                    Continue
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleRequestPermissions}
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MobilePermissions
