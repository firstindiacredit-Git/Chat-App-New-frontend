import React from 'react'
import { Link } from 'react-router-dom'
import { MdOutlinePersonAdd } from "react-icons/md";
import { LiaUserFriendsSolid } from "react-icons/lia";

const Header = ({ 
  user, 
  isConnected, 
  totalUnreadCount = 0, 
  onProfileClick, 
  title = "Chats",
  showBackButton = false,
  onBackClick = null,
  showActions = true,
  receiver = null, // Chat receiver data
  isReceiverOnline = false, // Online status
  showCallButtons = false, // Whether to show call buttons
  onVoiceCall = null, // Voice call handler
  onVideoCall = null, // Video call handler
  onReceiverClick = null, // Receiver profile click handler
  isReceiverBlocked = false, // Whether receiver is blocked
  showFriendRequestsButton = false // Whether to show friend requests button
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] bg-gradient-to-r from-whatsapp-green to-whatsapp-dark text-white shadow-md">
      <div className="flex items-center justify-between px-4 py-3  pt-12 max-w-full">
        <div className="flex items-center gap-3 flex-1">
          {showBackButton && (
            <button 
              className="bg-transparent border-none text-white text-xl p-2 cursor-pointer rounded-full transition-colors duration-300 hover:bg-white/10"
              onClick={onBackClick}
            >
              ←
            </button>
          )}
          
          {/* Show receiver avatar and info when in chat */}
          {receiver && (
            <div 
              className={`flex items-center gap-3 flex-1 ${onReceiverClick ? 'cursor-pointer hover:bg-white/10 rounded-lg p-2 -m-2 transition-colors duration-200' : ''}`}
              onClick={() => onReceiverClick && onReceiverClick(receiver)}
              title={onReceiverClick ? 'View profile' : ''}
            >
              {/* Receiver Avatar */}
              <div className="relative">
                {receiver.avatar ? (
                  <img 
                    src={receiver.avatar}
                    alt={receiver.name}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      console.log('❌ Avatar failed to load:', receiver.avatar);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                {/* Fallback avatar */}
                <div 
                  className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-semibold"
                  style={{ display: receiver.avatar ? 'none' : 'flex' }}
                >
                  {receiver.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {/* Online indicator */}
                {isReceiverOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                )}
              </div>
              
              {/* Name and status */}
              <div className="flex flex-col flex-1">
                <h3 className="m-0 text-lg font-semibold leading-tight">{receiver.name || title}</h3>
                <span className={`text-xs ${isReceiverBlocked ? 'text-red-300' : 'text-white/70'}`}>
                  {isReceiverBlocked ? 'Blocked' : (isReceiverOnline ? 'Online' : 'Offline')}
                </span>
              </div>
            </div>
          )}
          
          {/* Default title when not in chat */}
          {!receiver && (
            <div className="flex items-center gap-2 flex-1">
              <h3 className="m-0 text-xl font-semibold">{title}</h3>
              {isConnected !== undefined && (
                <div 
                  className="flex items-center"
                  title={isConnected ? 'Connected' : 'Disconnected'}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected 
                      ? 'bg-whatsapp-green animate-pulse' 
                      : 'bg-red-400'
                  }`}></div>
                </div>
              )}
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex gap-1 items-center">
            {/* Call buttons when in chat */}
            {showCallButtons && receiver && (
              <>
                <button
                  onClick={onVoiceCall}
                  className="bg-white/10 border-none text-white text-xl p-2 rounded-full cursor-pointer flex items-center justify-center min-w-[40px] h-10 transition-colors duration-300 hover:bg-white/20"
                  title="Voice Call"
                >
                  📞
                </button>
                <button
                  onClick={onVideoCall}
                  className="bg-white/10 border-none text-white text-xl p-2 rounded-full cursor-pointer flex items-center justify-center min-w-[40px] h-10 transition-colors duration-300 hover:bg-white/20"
                  title="Video Call"
                >
                  📹
                </button>
              </>
            )}
            
            {/* Default actions when not in chat */}
            {!showCallButtons && (
              <>
                <Link 
                  to="/users" 
                  className="bg-white/10 border-none text-white text-xl p-1 rounded-full cursor-pointer flex items-center justify-center min-w-[38px] h-9 no-underline transition-colors duration-300 hover:bg-white/20"
                  title="View Users"
                >
                  <MdOutlinePersonAdd />
                </Link>
                
                {showFriendRequestsButton && (
                  <Link 
                    to="/friend-requests" 
                    className="bg-white/10 border-none text-white text-lg p-2 rounded-full cursor-pointer flex items-center justify-center min-w-[40px] h-10 no-underline transition-colors duration-300 hover:bg-white/20"
                    title="Friend Requests"
                  >
                  < LiaUserFriendsSolid />
                  </Link>
                )}
              </>
            )}
            
            {/* Only show profile button when not in chat or when explicitly showing actions without call buttons */}
            {!receiver && (
              <button 
                className=" text-white text-xl p-2 rounded-full cursor-pointer flex items-center justify-center min-w-[40px] h-10 transition-colors duration-300 hover:bg-white/20"
                onClick={onProfileClick}
                title="Profile"
              >
                {user?.avatar ? (
                  <img 
                    src={user.avatar}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-whatsapp-green text-white flex items-center justify-center text-sm font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Header
