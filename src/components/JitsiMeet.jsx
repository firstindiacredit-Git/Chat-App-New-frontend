import React, { useEffect, useRef, useState } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

const JitsiMeet = ({ 
  user, 
  callData, 
  isIncoming = false, 
  onCallEnd, 
  onCallAnswer,
  onCallDecline 
}) => {
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'outgoing');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentRoomName, setCurrentRoomName] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const jitsiContainerRef = useRef(null);

  // Use room name from call data or generate one
  // Generate a simpler room name to avoid membersOnly issues
  const generateSimpleRoomName = () => {
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const random = Math.random().toString(36).substr(2, 6); // 6 random chars
    return `call-${timestamp}-${random}`;
  };
  
  // Initialize room name
  React.useEffect(() => {
    if (!currentRoomName) {
      setCurrentRoomName(callData?.roomName || callData?.callId || generateSimpleRoomName());
    }
  }, [callData, currentRoomName]);
  
  const roomName = currentRoomName || generateSimpleRoomName();
  
  // Jitsi Meet configuration
  const jitsiConfig = {
    roomName: roomName,
    width: '100%',
    height: '100%',
    parentNode: jitsiContainerRef.current,
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: callData?.callType === 'voice',
      enableWelcomePage: false,
      prejoinPageEnabled: false,
      disableModeratorIndicator: true,
      startScreenSharing: false,
      enableEmailInStats: false,
      // Fix membersOnly error
      enableLobby: false,
      enableClosePage: false,
      requireDisplayName: false,
      enableUserRolesBasedOnToken: false,
      enableInsecureRoomNameWarning: false,
      // Use a more permissive server
      hosts: {
        domain: 'meet.jit.si',
        muc: 'conference.meet.jit.si'
      },
      // Disable authentication requirements
      enableNoisyMicDetection: false,
      enableTalkWhileMuted: false,
      enableLayerSuspension: false,
      // Allow anonymous access
      enableAnonymousAuthentication: true,
      enableGuestDomain: true,
    },
    interfaceConfigOverwrite: {
      TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', 'security'
      ],
      SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      SHOW_POWERED_BY: false,
      SHOW_POLICY_WATERMARK: false,
      SHOW_LOBBY_BUTTON: true,
      SHOW_MEETING_TIMER: true,
      SHOW_CLOSE_PAGE: false,
      SHOW_PREJOIN_PAGE: false,
      SHOW_WELCOME_PAGE: false,
    },
    userInfo: {
      displayName: user?.name || 'User',
      email: user?.email || '',
    },
    onLoad: () => {
      console.log('📞 Jitsi Meet loaded successfully');
      setCallStatus('connected');
      setIsConnecting(false);
    },
    onReadyToClose: () => {
      console.log('📞 Jitsi Meet ready to close');
      handleCallEnd();
    },
    onError: (error) => {
      console.error('📞 Jitsi Meet error:', error);
      if (error === 'conference.connectionError.membersOnly' && retryCount < 3) {
        console.log('📞 Retrying with new room name...');
        setRetryCount(prev => prev + 1);
        // Generate a new room name and retry
        const newRoomName = generateSimpleRoomName();
        setCurrentRoomName(newRoomName);
        setError(null); // Clear any previous errors
      } else if (error === 'conference.connectionError.membersOnly') {
        setError('Room access restricted. Please try again later.');
      } else if (error === 'conference.connectionError.connectionFailed') {
        setError('Connection failed. Please check your internet connection.');
      } else {
        setError(`Call error: ${error}`);
      }
    },
    onApiReady: (api) => {
      console.log('📞 Jitsi Meet API ready');
      
      // Handle call events
      api.addEventListeners({
        videoConferenceJoined: () => {
          console.log('📞 User joined the conference');
          setCallStatus('connected');
          onCallAnswer && onCallAnswer();
        },
        videoConferenceLeft: () => {
          console.log('📞 User left the conference');
          handleCallEnd();
        },
        participantJoined: (participant) => {
          console.log('📞 Participant joined:', participant);
        },
        participantLeft: (participant) => {
          console.log('📞 Participant left:', participant);
        },
        audioMuteStatusChanged: (audio) => {
          console.log('📞 Audio mute status changed:', audio);
        },
        videoMuteStatusChanged: (video) => {
          console.log('📞 Video mute status changed:', video);
        },
      });
    },
  };

  const handleCallEnd = () => {
    setCallStatus('ended');
    onCallEnd && onCallEnd();
  };

  const handleCallAnswer = () => {
    setCallStatus('connected');
    onCallAnswer && onCallAnswer();
  };

  const handleCallDecline = () => {
    setCallStatus('declined');
    onCallDecline && onCallDecline();
  };

  // Show incoming call interface for incoming calls
  if (isIncoming && callStatus === 'incoming') {
    return (
      <div className="jitsi-call-container">
        <div className="call-info-overlay">
          <div className="call-user-info">
            <div className="call-avatar">
              {callData?.otherUser?.avatar ? (
                <img src={callData.otherUser.avatar} alt={callData.otherUser.name} />
              ) : (
                <div className="avatar-placeholder">
                  {callData?.otherUser?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <h2>{callData?.otherUser?.name || 'Unknown'}</h2>
            <p className="call-status-text">
              {callData?.callType === 'video' ? 'Incoming video call...' : 'Incoming voice call...'}
            </p>
          </div>
        </div>

        <div className="call-controls">
          <button 
            className="call-control-btn decline-btn"
            onClick={handleCallDecline}
          >
            📞❌
          </button>
          <button 
            className="call-control-btn answer-btn"
            onClick={handleCallAnswer}
          >
            📞✅
          </button>
        </div>
      </div>
    );
  }

  // Show error if any
  if (error) {
    return (
      <div className="call-error-container">
        <div className="call-error">
          <div className="error-icon">❌</div>
          <h3>Call Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={handleCallEnd}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show Jitsi Meet interface
  return (
    <div className="jitsi-call-container">
      <div className="jitsi-header">
        <div className="call-info">
          <h3>{callData?.otherUser?.name || 'Call'}</h3>
          <p>{callData?.callType === 'video' ? 'Video Call' : 'Voice Call'}</p>
        </div>
        <button className="end-call-btn" onClick={handleCallEnd}>
          📞❌ End Call
        </button>
      </div>
      
      <div className="jitsi-meeting-container" ref={jitsiContainerRef}>
        {isConnecting && (
          <div className="jitsi-loading">
            <div className="loading-spinner"></div>
            <p>Connecting to call...</p>
            {retryCount > 0 && (
              <p className="retry-info">Retrying... (Attempt {retryCount + 1})</p>
            )}
          </div>
        )}
        <JitsiMeeting
          roomName={jitsiConfig.roomName}
          configOverwrite={jitsiConfig.configOverwrite}
          interfaceConfigOverwrite={jitsiConfig.interfaceConfigOverwrite}
          userInfo={jitsiConfig.userInfo}
          onLoad={jitsiConfig.onLoad}
          onReadyToClose={jitsiConfig.onReadyToClose}
          onError={jitsiConfig.onError}
          onApiReady={jitsiConfig.onApiReady}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
          }}
        />
      </div>
    </div>
  );
};

export default JitsiMeet;
