import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

const WebRTCAudioCall = ({ 
  user, 
  callData, 
  isIncoming = false, 
  onCallEnd, 
  onCallAnswer,
  onCallDecline 
}) => {
  const { socket } = useSocket();
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'outgoing');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);
  
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);

  // WebRTC configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize WebRTC
  const initializeWebRTC = async () => {
    try {
      console.log('🎤 Initializing WebRTC for audio call');
      
      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(rtcConfiguration);
      
      // Set up event handlers
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('🧊 Sending ICE candidate:', {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            callId: callData.callId
          });
          
          try {
            socket.emit('ice-candidate', {
              callId: callData.callId,
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid,
            });
          } catch (error) {
            console.error('❌ Error sending ICE candidate:', error);
          }
        } else {
          console.log('🧊 ICE candidate event but no candidate or socket:', {
            hasCandidate: !!event.candidate,
            hasSocket: !!socket,
            callId: callData.callId
          });
        }
      };

      peerConnectionRef.current.ontrack = (event) => {
        console.log('🎵 Received remote audio stream');
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        console.log('📞 Connection state changed:', state);
        
        if (state === 'connected') {
          setCallStatus('connected');
          startCallTimer();
        } else if (state === 'disconnected' || state === 'failed') {
          handleCallEnd();
        }
      };

      // Get user media (audio only)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      localStreamRef.current = stream;
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      // Add audio track to peer connection
      stream.getAudioTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      console.log('✅ WebRTC initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing WebRTC:', error);
      setError('Failed to access microphone. Please check permissions.');
      return false;
    }
  };

  // Start call timer
  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop call timer
  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle incoming call answer
  const handleAnswer = async () => {
    console.log('📞 Answering incoming call');
    
    const initialized = await initializeWebRTC();
    if (!initialized) return;

    setCallStatus('connecting');
    onCallAnswer && onCallAnswer();

    // Send answer to caller via socket
    if (socket) {
      socket.emit('call-answer', {
        callId: callData.callId,
      });
    }
  };

  // Handle call decline
  const handleDecline = () => {
    console.log('📞 Declining call');
    setCallStatus('declined');
    onCallDecline && onCallDecline();

    if (socket) {
      socket.emit('call-decline', {
        callId: callData.callId,
      });
    }
  };

  // Handle call end
  const handleCallEnd = () => {
    console.log('📞 Ending call');
    
    // Stop call timer
    stopCallTimer();
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    setCallStatus('ended');
    onCallEnd && onCallEnd();

    if (socket) {
      socket.emit('call-end', {
        callId: callData.callId,
      });
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('🎤 Audio', audioTrack.enabled ? 'unmuted' : 'muted');
      }
    }
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleCallAnswered = async (data) => {
      if (data.callId === callData.callId) {
        console.log('📞 Call answered by receiver');
        setCallStatus('connecting');
        
        // Create offer for outgoing call
        try {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          
          socket.emit('call-offer', {
            callId: callData.callId,
            offer: offer,
          });
        } catch (error) {
          console.error('❌ Error creating offer:', error);
          setError('Failed to establish connection');
        }
      }
    };

    const handleCallOffer = async (data) => {
      if (data.callId === callData.callId) {
        console.log('📞 Received call offer');
        
        try {
          await peerConnectionRef.current.setRemoteDescription(data.offer);
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          socket.emit('call-answer-webrtc', {
            callId: callData.callId,
            answer: answer,
          });
        } catch (error) {
          console.error('❌ Error handling offer:', error);
          setError('Failed to establish connection');
        }
      }
    };

    const handleCallAnswerWebRTC = async (data) => {
      if (data.callId === callData.callId) {
        console.log('📞 Received call answer');
        
        try {
          await peerConnectionRef.current.setRemoteDescription(data.answer);
        } catch (error) {
          console.error('❌ Error handling answer:', error);
          setError('Failed to establish connection');
        }
      }
    };

    const handleIceCandidate = async (data) => {
      if (data.callId === callData.callId && peerConnectionRef.current) {
        console.log('🧊 Received ICE candidate:', data);
        
        try {
          const candidate = new RTCIceCandidate({
            candidate: data.candidate,
            sdpMLineIndex: data.sdpMLineIndex,
            sdpMid: data.sdpMid,
          });
          await peerConnectionRef.current.addIceCandidate(candidate);
          console.log('✅ ICE candidate added successfully');
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
        }
      }
    };

    const handleCallDeclined = (data) => {
      if (data.callId === callData.callId) {
        console.log('📞 Call declined by receiver');
        setCallStatus('declined');
        handleCallEnd();
      }
    };

    const handleCallEnded = (data) => {
      if (data.callId === callData.callId) {
        console.log('📞 Call ended by other user');
        handleCallEnd();
      }
    };

    // Register socket listeners
    socket.on('call-answered', handleCallAnswered);
    socket.on('call-offer', handleCallOffer);
    socket.on('call-answer-webrtc', handleCallAnswerWebRTC);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-declined', handleCallDeclined);
    socket.on('call-ended', handleCallEnded);

    return () => {
      socket.off('call-answered', handleCallAnswered);
      socket.off('call-offer', handleCallOffer);
      socket.off('call-answer-webrtc', handleCallAnswerWebRTC);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-declined', handleCallDeclined);
      socket.off('call-ended', handleCallEnded);
    };
  }, [socket, callData.callId]);

  // Initialize WebRTC for outgoing calls
  useEffect(() => {
    if (!isIncoming && callStatus === 'outgoing') {
      initializeWebRTC();
    }
  }, [isIncoming, callStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallTimer();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Show incoming call interface
  if (isIncoming && callStatus === 'incoming') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
          {/* Caller Avatar */}
          <div className="mb-6">
            {callData?.caller?.avatar ? (
              <img 
                src={callData.caller.avatar} 
                alt={callData.caller.name}
                className="w-24 h-24 rounded-full mx-auto object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto bg-green-500 text-white flex items-center justify-center text-2xl font-bold">
                {callData?.caller?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          
          {/* Caller Info */}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {callData?.caller?.name || 'Unknown'}
          </h2>
          <p className="text-gray-600 mb-8">
            📞 Incoming voice call...
          </p>
          
          {/* Call Controls */}
          <div className="flex justify-center gap-6">
            <button 
              onClick={handleDecline}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-2xl transition-colors shadow-lg"
            >
              📞❌
            </button>
            <button 
              onClick={handleAnswer}
              className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-2xl transition-colors shadow-lg"
            >
              📞✅
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show error if any
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Call Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={handleCallEnd}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show audio call interface
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-400 to-green-600 flex flex-col items-center justify-center z-50 text-white">
      {/* Hidden audio elements */}
      <audio ref={localAudioRef} muted autoPlay />
      <audio ref={remoteAudioRef} autoPlay />
      
      {/* Call Header */}
      <div className="text-center mb-8">
        <h2 className="text-sm text-green-100 mb-2">
          {callStatus === 'connecting' ? 'Connecting...' : 
           callStatus === 'connected' ? 'Voice Call' : 
           callStatus === 'outgoing' ? 'Calling...' : 'Call'}
        </h2>
        <h1 className="text-2xl font-semibold">
          {callData?.otherUser?.name || callData?.caller?.name || 'Unknown'}
        </h1>
        {callStatus === 'connected' && (
          <p className="text-green-100 mt-2">
            {formatDuration(callDuration)}
          </p>
        )}
      </div>

      {/* User Avatar */}
      <div className="mb-12">
        {(callData?.otherUser?.avatar || callData?.caller?.avatar) ? (
          <img 
            src={callData?.otherUser?.avatar || callData?.caller?.avatar}
            alt={callData?.otherUser?.name || callData?.caller?.name}
            className="w-32 h-32 rounded-full object-cover shadow-2xl"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-4xl font-bold shadow-2xl">
            {(callData?.otherUser?.name || callData?.caller?.name)?.charAt(0) || 'U'}
          </div>
        )}
      </div>

      {/* Call Status */}
      <div className="mb-8 text-center">
        {callStatus === 'outgoing' && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-green-100">Calling...</span>
          </div>
        )}
        {callStatus === 'connecting' && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            <span className="text-green-100">Connecting...</span>
          </div>
        )}
        {callStatus === 'connected' && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-300 rounded-full"></div>
            <span className="text-green-100">Connected</span>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="flex gap-6">
        {/* Mute Button */}
        {callStatus === 'connected' && (
          <button
            onClick={toggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all shadow-lg ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
        )}
        
        {/* End Call Button */}
        <button 
          onClick={handleCallEnd}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-2xl transition-colors shadow-lg"
          title="End Call"
        >
          📞❌
        </button>
      </div>

      {/* Connection Quality Indicator */}
      {callStatus === 'connected' && (
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-1">
            <div className="w-1 h-2 bg-green-300 rounded"></div>
            <div className="w-1 h-3 bg-green-300 rounded"></div>
            <div className="w-1 h-4 bg-green-300 rounded"></div>
            <div className="w-1 h-3 bg-green-300 rounded"></div>
            <div className="w-1 h-2 bg-green-300 rounded"></div>
          </div>
          <span className="text-xs text-green-100 mt-1 block">Good quality</span>
        </div>
      )}
    </div>
  );
};

export default WebRTCAudioCall;
