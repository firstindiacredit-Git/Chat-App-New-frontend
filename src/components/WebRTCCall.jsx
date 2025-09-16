import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

const WebRTCCall = ({ 
  user, 
  callData, 
  isIncoming = false, 
  onCallEnd, 
  onCallAnswer,
  onCallDecline 
}) => {
  const { socket, isConnected } = useSocket();
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'outgoing');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callData?.callType === 'video');
  
  // Debug video state
  console.log('📞 Video call type:', callData?.callType, 'isVideoEnabled:', isVideoEnabled);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const answerProcessedRef = useRef(false);
  const processedCallIdRef = useRef(null);
  const callEndedRef = useRef(false);
  const offerCreatedRef = useRef(false);
  const iceCandidateQueueRef = useRef([]);
  const webrtcInitializedRef = useRef(false);

  // WebRTC configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize WebRTC
  useEffect(() => {
    if (callData && callData.callId && isConnected) {
      initializeWebRTC();
    }

    return () => {
      cleanup();
    };
  }, [callData, isConnected]);

  // Update call duration
  useEffect(() => {
    if (callStatus === 'connected' && callStartTimeRef.current) {
      durationIntervalRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(duration);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  const initializeWebRTC = async () => {
    try {
      // Reset answer processed flag and call ID
      answerProcessedRef.current = false;
      processedCallIdRef.current = null;
      callEndedRef.current = false;
      offerCreatedRef.current = false;
      iceCandidateQueueRef.current = [];
      webrtcInitializedRef.current = false;
      
      // Get user media
      const constraints = {
        audio: true,
        video: isVideoEnabled ? { width: 640, height: 480 } : false,
      };
      
      console.log('📞 Media constraints:', constraints);
      
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('📞 Local stream obtained:', localStreamRef.current);
      } catch (mediaError) {
        console.error('📞 Media access error:', mediaError);
        console.error('📞 Media error name:', mediaError.name);
        console.error('📞 Media error message:', mediaError.message);
        
        if (mediaError.name === 'NotAllowedError') {
          setError('Camera/microphone access denied. Please allow access and try again.');
        } else if (mediaError.name === 'NotFoundError') {
          setError('Camera/microphone not found. Please check your devices.');
        } else if (mediaError.name === 'NotReadableError') {
          setError('Camera/microphone is being used by another application.');
        } else {
          setError(`Media access failed: ${mediaError.message}`);
        }
        return;
      }
      
      // Ensure local audio tracks are enabled
      const localAudioTracks = localStreamRef.current.getAudioTracks();
      localAudioTracks.forEach(track => {
        track.enabled = true;
        console.log('📞 Local audio track enabled:', track.label);
      });
      
      // Ensure local video tracks are enabled
      const localVideoTracks = localStreamRef.current.getVideoTracks();
      localVideoTracks.forEach(track => {
        track.enabled = true;
        console.log('📞 Local video track enabled:', track.label, 'readyState:', track.readyState);
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        console.log('📞 Local video element set up:', localVideoRef.current);
        console.log('📞 Local stream tracks:', localStreamRef.current.getTracks().map(t => ({kind: t.kind, label: t.label, enabled: t.enabled})));
        
        // Force local video to play
        localVideoRef.current.play().catch(e => console.error('📞 Local video play error:', e));
      } else {
        console.warn('📞 Local video ref not available');
      }

      // Create peer connection
      try {
        peerConnectionRef.current = new RTCPeerConnection(rtcConfiguration);
        console.log('📞 Peer connection created successfully');
      } catch (pcError) {
        console.error('📞 Peer connection creation error:', pcError);
        setError(`Failed to create peer connection: ${pcError.message}`);
        return;
      }

      // Add local stream to peer connection
      try {
        localStreamRef.current.getTracks().forEach(track => {
          console.log('📞 Adding track to peer connection:', track.kind, track.label);
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        });
        console.log('📞 All tracks added to peer connection successfully');
      } catch (trackError) {
        console.error('📞 Track addition error:', trackError);
        setError(`Failed to add tracks to peer connection: ${trackError.message}`);
        return;
      }

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        console.log('📞 Received remote stream:', event.streams[0]);
        console.log('📞 Remote stream tracks:', event.streams[0].getTracks().map(t => ({kind: t.kind, label: t.label, enabled: t.enabled})));
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          console.log('📞 Remote video element set up:', remoteVideoRef.current);
          
          // Force video to play
          remoteVideoRef.current.play().catch(e => console.error('📞 Remote video play error:', e));
          
          // Ensure audio is enabled for remote stream
          const remoteStream = event.streams[0];
          const audioTracks = remoteStream.getAudioTracks();
          audioTracks.forEach(track => {
            track.enabled = true;
            console.log('📞 Remote audio track enabled:', track.label);
          });
          
          // Ensure video is enabled for remote stream
          const videoTracks = remoteStream.getVideoTracks();
          videoTracks.forEach(track => {
            track.enabled = true;
            console.log('📞 Remote video track enabled:', track.label, 'readyState:', track.readyState);
          });
          
          // Set volume to maximum
          if (remoteVideoRef.current.volume !== undefined) {
            remoteVideoRef.current.volume = 1.0;
          }
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('📞 Sending ICE candidate:', event.candidate.type);
          socket.emit('ice-candidate', {
            callId: callData.callId,
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
          });
        } else if (event.candidate === null) {
          console.log('📞 ICE gathering complete');
        }
      };

      // Handle connection state changes
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        console.log('📞 Connection state changed:', state);
        
        if (state === 'connected') {
          setCallStatus('connected');
          callStartTimeRef.current = Date.now();
        } else if (peerConnectionRef.current.connectionState === 'disconnected' || 
                   peerConnectionRef.current.connectionState === 'failed') {
          handleCallEnd();
        }
      };

      // Set up socket event listeners
      setupSocketListeners();

      // Mark WebRTC as initialized
      webrtcInitializedRef.current = true;
      console.log('📞 WebRTC initialization completed successfully');

      // For outgoing calls, create and send offer
      if (!isIncoming) {
        await createAndSendOffer();
      }

    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      webrtcInitializedRef.current = false;
      setError('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    console.log('📞 Setting up socket listeners for call:', callData.callId);

    // Remove existing listeners to prevent duplicates
    socket.off('call-answered');
    socket.off('call-declined');
    socket.off('call-ended');
    socket.off('call-error');
    socket.off('call-offer');
    socket.off('ice-candidate');

    // Handle incoming call answer
    socket.on('call-answered', async (data) => {
      if (data.callId === callData.callId) {
        console.log('📞 Received call-answered event:', data);
        
        // Check if we've already processed this specific call
        if (processedCallIdRef.current === data.callId) {
          console.log('📞 Answer for this call already processed, skipping');
          return;
        }
        
        try {
          if (data.answer && peerConnectionRef.current) {
            // Parse the answer if it's a string
            const parsedAnswer = typeof data.answer === 'string' ? JSON.parse(data.answer) : data.answer;
            
            // Check if we're in the correct state to set remote description
            const currentState = peerConnectionRef.current.signalingState;
            console.log('📞 Current signaling state for answer:', currentState);
            console.log('📞 Answer already processed:', answerProcessedRef.current);
            
            if (currentState === 'have-local-offer' && !answerProcessedRef.current) {
              await peerConnectionRef.current.setRemoteDescription(parsedAnswer);
              answerProcessedRef.current = true;
              processedCallIdRef.current = data.callId;
              console.log('📞 Remote answer set successfully');
              
              // Process any queued ICE candidates
              await processQueuedIceCandidates();
            } else {
              console.warn('📞 Cannot set remote answer in state:', currentState, 'or already processed');
            }
          }
          
          setCallStatus('connected');
          callStartTimeRef.current = Date.now();
        } catch (error) {
          console.error('Error handling call answer:', error);
          setError('Failed to handle call answer');
        }
      }
    });

    // Handle call declined
    socket.on('call-declined', (data) => {
      if (data.callId === callData.callId) {
        setCallStatus('declined');
        setTimeout(() => {
          onCallEnd();
        }, 2000);
      }
    });

    // Handle call ended
    socket.on('call-ended', (data) => {
      if (data.callId === callData.callId) {
        handleCallEnd();
      }
    });

    // Handle ICE candidates
    socket.on('ice-candidate', async (data) => {
      if (data.callId === callData.callId && peerConnectionRef.current) {
        try {
          // Check if we have a remote description before adding ICE candidates
          const currentState = peerConnectionRef.current.signalingState;
          console.log('📞 Current signaling state for ICE candidate:', currentState);
          
          if (currentState === 'stable' || currentState === 'have-local-offer' || currentState === 'have-remote-offer') {
            console.log('📞 Adding ICE candidate:', data.candidate.substring(0, 50) + '...');
            await peerConnectionRef.current.addIceCandidate({
              candidate: data.candidate,
              sdpMLineIndex: data.sdpMLineIndex,
              sdpMid: data.sdpMid,
            });
            console.log('📞 ICE candidate added successfully');
          } else {
            // Queue the ICE candidate for later
            console.log('📞 Queueing ICE candidate for later processing');
            iceCandidateQueueRef.current.push({
              candidate: data.candidate,
              sdpMLineIndex: data.sdpMLineIndex,
              sdpMid: data.sdpMid,
            });
          }
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // Handle call errors
    socket.on('call-error', (data) => {
      setError(data.error);
    });

    // Handle receiving offer for incoming calls
    socket.on('call-offer', async (data) => {
      if (data.callId === callData.callId && isIncoming) {
        try {
          // Parse the offer if it's a string
          const offer = typeof data.offer === 'string' ? JSON.parse(data.offer) : data.offer;
          
          if (peerConnectionRef.current) {
            // Check if we're in the correct state to set remote description
            const currentState = peerConnectionRef.current.signalingState;
            console.log('📞 Current signaling state for offer:', currentState);
            
            if (currentState === 'stable') {
              await peerConnectionRef.current.setRemoteDescription(offer);
              console.log('📞 Remote offer set successfully');
              
              // Process any queued ICE candidates
              await processQueuedIceCandidates();
            } else {
              console.warn('📞 Cannot set remote offer in state:', currentState);
            }
          }
        } catch (error) {
          console.error('Error handling incoming offer:', error);
          setError('Failed to handle call offer');
        }
      }
    });
  };

  const processQueuedIceCandidates = async () => {
    if (iceCandidateQueueRef.current.length > 0) {
      console.log('📞 Processing queued ICE candidates:', iceCandidateQueueRef.current.length);
      for (const candidate of iceCandidateQueueRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
          console.log('📞 Queued ICE candidate added successfully');
        } catch (error) {
          console.error('Error adding queued ICE candidate:', error);
        }
      }
      iceCandidateQueueRef.current = [];
    }
  };

  const createAndSendOffer = async () => {
    try {
      console.log('📞 Starting offer creation process...');
      
      // Check if WebRTC is initialized
      if (!webrtcInitializedRef.current) {
        console.error('📞 WebRTC not initialized yet');
        setError('WebRTC not initialized yet');
        return;
      }
      
      // Check if peer connection exists
      if (!peerConnectionRef.current) {
        console.error('📞 Peer connection not available');
        setError('Peer connection not available');
        return;
      }
      
      // Check if socket is connected
      if (!socket || !socket.connected) {
        console.error('📞 Socket not connected');
        setError('Socket connection not available');
        return;
      }
      
      // Check if call data is available
      if (!callData || !callData.callId) {
        console.error('📞 Call data not available:', callData);
        setError('Call data not available');
        return;
      }
      
      // Prevent duplicate offer creation
      if (offerCreatedRef.current) {
        console.log('📞 Offer already created, skipping');
        return;
      }
      
      // Check if we're in the correct state to create an offer
      const currentState = peerConnectionRef.current.signalingState;
      console.log('📞 Current signaling state for offer creation:', currentState);
      
      if (currentState !== 'stable') {
        console.warn('📞 Cannot create offer in state:', currentState);
        setError(`Cannot create offer in state: ${currentState}`);
        return;
      }
      
      console.log('📞 Creating WebRTC offer...');
      const offer = await peerConnectionRef.current.createOffer();
      console.log('📞 Offer created:', offer);
      
      console.log('📞 Setting local description...');
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log('📞 Local description set successfully');
      
      offerCreatedRef.current = true;

      console.log('📞 Sending offer via socket...');
      // Send offer to the receiver through socket
      socket.emit('call-offer', {
        callId: callData.callId,
        offer: offer,
      });

      setCallStatus('ringing');
      console.log('📞 Offer created and sent successfully');
    } catch (error) {
      console.error('📞 Detailed error creating and sending offer:', error);
      console.error('📞 Error name:', error.name);
      console.error('📞 Error message:', error.message);
      console.error('📞 Error stack:', error.stack);
      setError(`Failed to create call offer: ${error.message}`);
    }
  };


  const handleCallAnswer = async () => {
    try {
      if (peerConnectionRef.current) {
        // Check if we're in the correct state to create an answer
        const currentState = peerConnectionRef.current.signalingState;
        console.log('📞 Current signaling state for answer creation:', currentState);
        
        if (currentState === 'have-remote-offer') {
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          // Send answer through socket
          socket.emit('call-answer', {
            callId: callData.callId,
            answer: answer,
          });

          setCallStatus('connected');
          callStartTimeRef.current = Date.now();
          onCallAnswer && onCallAnswer();
          console.log('📞 Answer created and sent successfully');
        } else {
          console.warn('📞 Cannot create answer in state:', currentState);
          setError('Cannot answer call in current state');
        }
      } else {
        console.error('Peer connection not ready');
        setError('Call connection not ready');
      }
    } catch (error) {
      console.error('Error answering call:', error);
      setError('Failed to answer call');
    }
  };

  const handleCallDecline = () => {
    if (socket) {
      socket.emit('call-decline', {
        callId: callData.callId,
      });
    }
    setCallStatus('declined');
    onCallDecline && onCallDecline();
    setTimeout(() => {
      onCallEnd();
    }, 1000);
  };

  const handleCallEnd = () => {
    if (callEndedRef.current) {
      console.log('📞 Call already ended, skipping duplicate end');
      return;
    }
    
    callEndedRef.current = true;
    
    if (socket) {
      socket.emit('call-end', {
        callId: callData.callId,
      });
    }
    setCallStatus('ended');
    onCallEnd && onCallEnd();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const newVideoState = !isVideoEnabled;
      
      videoTracks.forEach(track => {
        track.enabled = newVideoState;
        console.log('📞 Video track enabled:', newVideoState, track.label);
      });
      
      setIsVideoEnabled(newVideoState);
      console.log('📞 Video toggled to:', newVideoState);
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="call-error-container">
        <div className="call-error">
          <div className="error-icon">❌</div>
          <h3>Call Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={onCallEnd}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="webrtc-call-container">
      {/* Video streams */}
      <div className="video-container">
        {isVideoEnabled ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video"
              onLoadedMetadata={() => console.log('📞 Remote video loaded')}
              onError={(e) => console.error('📞 Remote video error:', e)}
              onCanPlay={() => console.log('📞 Remote video can play')}
              onPlay={() => console.log('📞 Remote video playing')}
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
              onLoadedMetadata={() => console.log('📞 Local video loaded')}
              onError={(e) => console.error('📞 Local video error:', e)}
              onCanPlay={() => console.log('📞 Local video can play')}
              onPlay={() => console.log('📞 Local video playing')}
            />
          </>
        ) : (
          <div className="audio-only-indicator">
            <p>Audio Only Call</p>
          </div>
        )}
      </div>

      {/* Call info overlay */}
      <div className="call-info-overlay">
        <div className="call-user-info">
          <div className="call-avatar">
            {(callData?.otherUser?.avatar || callData?.receiver?.avatar || callData?.caller?.avatar) ? (
              <img src={callData.otherUser?.avatar || callData.receiver?.avatar || callData.caller?.avatar} alt={callData.otherUser?.name || callData.receiver?.name || callData.caller?.name} />
            ) : (
              <div className="default-avatar-large">
                {(callData?.otherUser?.name || callData?.receiver?.name || callData?.caller?.name)?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <h2>{callData?.otherUser?.name || callData?.receiver?.name || callData?.caller?.name || 'Unknown'}</h2>
          <p className="call-status-text">
            {callStatus === 'incoming' && 'Incoming call...'}
            {callStatus === 'outgoing' && 'Calling...'}
            {callStatus === 'ringing' && 'Ringing...'}
            {callStatus === 'connected' && `Connected - ${formatDuration(callDuration)}`}
            {callStatus === 'declined' && 'Call declined'}
            {callStatus === 'ended' && 'Call ended'}
          </p>
        </div>
      </div>

      {/* Call controls */}
      <div className="call-controls">
        {callStatus === 'incoming' && (
          <>
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
          </>
        )}

        {callStatus === 'connected' && (
          <>
            <button 
              className={`call-control-btn ${isMuted ? 'muted' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            
            {callData?.callType === 'video' && (
              <button 
                className={`call-control-btn ${!isVideoEnabled ? 'video-disabled' : ''}`}
                onClick={toggleVideo}
                title={isVideoEnabled ? 'Disable Video' : 'Enable Video'}
              >
                {isVideoEnabled ? '📹' : '📹❌'}
              </button>
            )}
            
            <button 
              className="call-control-btn end-btn"
              onClick={handleCallEnd}
              title="End Call"
            >
              📞❌
            </button>
          </>
        )}

        {(callStatus === 'outgoing' || callStatus === 'ringing') && (
          <button 
            className="call-control-btn end-btn"
            onClick={handleCallEnd}
            title="Cancel Call"
          >
            📞❌
          </button>
        )}
      </div>
    </div>
  );
};

export default WebRTCCall;