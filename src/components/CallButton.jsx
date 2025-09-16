import React, { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { IoMdCall } from "react-icons/io";
import { MdMissedVideoCall } from "react-icons/md";

const CallButton = ({ user, otherUser, callType = 'voice', onCallInitiated }) => {
  const { socket, isConnected } = useSocket();
  const [isCalling, setIsCalling] = useState(false);
  const [error, setError] = useState(null);

  const handleCall = async () => {
    if (!isConnected || !socket) {
      setError('Not connected to server');
      return;
    }

    if (!otherUser || !otherUser._id) {
      setError('Invalid user to call');
      return;
    }

    try {
      setIsCalling(true);
      setError(null);

      // Emit call initiation through socket
      socket.emit('call-initiate', {
        receiverId: otherUser._id,
        callType: callType,
      });

      // Don't call onCallInitiated here - wait for socket response

    } catch (error) {
      console.error('Error initiating call:', error);
      setError('Failed to initiate call');
      setIsCalling(false);
    }
  };

  const getCallIcon = () => {
    if (isCalling) {
      return <IoMdCall />;
    }
    return callType === 'video' ? <MdMissedVideoCall /> : <IoMdCall />;
  };

  const getCallTitle = () => {
    if (isCalling) {
      return 'Initiating call...';
    }
    return callType === 'video' ? 'Video Call' : 'Voice Call';
  };

  return (
    <div className="call-button-container">
      {error && (
        <div className="call-error-message">
          <span className="error-text">{error}</span>
          <button 
            className="error-close"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}
      
      <button
        className={`call-button ${callType} ${isCalling ? 'calling' : ''}`}
        onClick={handleCall}
        disabled={isCalling || !isConnected}
        title={getCallTitle()}
      >
        <span className="call-icon">{getCallIcon()}</span>
        <span className="call-text">
          {isCalling ? 'Calling...' : (callType === 'video' ? 'Video' : 'Call')}
        </span>
      </button>
    </div>
  );
};

export default CallButton;
