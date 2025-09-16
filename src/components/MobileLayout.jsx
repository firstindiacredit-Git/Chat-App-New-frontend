import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isMobilePlatform } from '../utils/mobilePermissions'
import mobileNavigationService from '../utils/mobileNavigation'

const MobileLayout = ({ children, title, showBackButton = true, onBackClick, headerActions }) => {
  const navigate = useNavigate()
  const location = useLocation()

  // Register this route with navigation service
  useEffect(() => {
    if (isMobilePlatform()) {
      mobileNavigationService.pushRoute(location.pathname);
    }
  }, [location.pathname]);

  // Handle back button
  useEffect(() => {
    if (!isMobilePlatform()) return;

    const handleHardwareBack = () => {
      if (onBackClick) {
        onBackClick();
        return true; // Handled
      } else {
        const backTarget = mobileNavigationService.getBackTarget(location.pathname);
        navigate(backTarget);
        return true; // Handled
      }
    };

    // Register back button handler
    const unsubscribe = mobileNavigationService.addBackButtonListener(handleHardwareBack);

    return unsubscribe;
  }, [location.pathname, onBackClick, navigate]);

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      // Smart navigation back
      const backTarget = mobileNavigationService.getBackTarget(location.pathname)
      navigate(backTarget)
    }
  }

  // Don't render mobile layout for non-mobile platforms
  if (!isMobilePlatform()) {
    return <div className="desktop-container">{children}</div>
  }

  return (
    <div className="mobile-container">
      {/* Mobile Header */}
      <div className="mobile-header-fix">
        <div className="mobile-header-content">
          {showBackButton && (
            <button 
              className="mobile-back-btn"
              onClick={handleBackClick}
              aria-label="Go back"
            >
              ←
            </button>
          )}
          
          <h1 className="mobile-header-title">
            {title || 'ChatApp'}
          </h1>
          
          <div className="mobile-header-actions">
            {headerActions}
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="mobile-content">
        {children}
      </div>
    </div>
  )
}

export default MobileLayout
