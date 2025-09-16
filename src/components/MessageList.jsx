import React, { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

const MessageList = ({ messages, currentUserId, receiver, onMessageReceived, isUserInChat = true, isGroupChat = false }) => {
  const messagesEndRef = useRef(null);
  const { socket, isConnected } = useSocket();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for new messages
  useEffect(() => {
    if (socket && isConnected) {
      const handleNewMessage = (data) => {
        const receiverId = data.message.receiver?._id || data.message.receiver?.id;
        const senderId = data.message.sender?._id || data.message.sender?.id;
        const groupId = data.message.group?._id || data.message.group;
        
        if (isGroupChat && groupId) {
          // Handle group messages
          if (groupId === receiver?._id || groupId === receiver?._id?.toString()) {
            if (onMessageReceived) {
              onMessageReceived(data.message);
            }
          }
        } else if (!isGroupChat) {
          // Handle private messages - ENHANCED LOGIC
          // Show ALL messages that involve the current chat
          if ((receiverId === currentUserId && senderId === receiver?.id) || 
              (senderId === currentUserId && receiverId === receiver?.id)) {
            console.log('📨 MessageList - Adding private message (universal handler)');
            if (onMessageReceived) {
              onMessageReceived(data.message);
            }
          }
        }
      };

      const handleMessageRead = (data) => {
        // Handle message read status if needed
        console.log('Message read:', data);
      };

      socket.on('new-message', handleNewMessage);
      socket.on('message-read', handleMessageRead);

      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('message-read', handleMessageRead);
      };
    }
  }, [socket, isConnected, currentUserId, receiver?.id, onMessageReceived]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  const renderFileAttachment = (attachment, messageType) => {
    if (!attachment || !attachment.url) return null;

    const handleFileClick = () => {
      if (attachment.url) {
        window.open(attachment.url, '_blank');
      }
    };

    const formatFileSize = (bytes) => {
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (mimeType) => {
      if (!mimeType) return '📎';
      if (mimeType.startsWith('image/')) return '🖼️';
      if (mimeType.startsWith('video/')) return '🎥';
      if (mimeType.includes('pdf')) return '📄';
      if (mimeType.includes('word')) return '📝';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
      if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
      return '📎';
    };

    if (messageType === 'image') {
      return (
        <div
          onClick={handleFileClick}
          style={{
            cursor: 'pointer',
            marginBottom: '8px',
            borderRadius: '8px',
            overflow: 'hidden',
            maxWidth: '400px', // Increased for better image display
          }}
        >
          <img
            src={attachment.url}
            alt={attachment.originalName || attachment.filename || 'Image'}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '400px',
              objectFit: 'contain', // Preserve aspect ratio and show full image
              borderRadius: '8px',
              backgroundColor: '#f5f5f5', // Background for transparent images
            }}
          />
        </div>
      );
    }

    if (messageType === 'video') {
      return (
        <div
          style={{
            marginBottom: '8px',
            borderRadius: '8px',
            overflow: 'hidden',
            maxWidth: '300px',
          }}
        >
          <video
            controls
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '300px',
              borderRadius: '8px',
            }}
          >
            <source src={attachment.url} type={attachment.mimeType} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // For other file types
    return (
      <div
        onClick={handleFileClick}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: '#F5F5F5',
          borderRadius: '8px',
          border: '1px solid #E0E0E0',
          marginBottom: '8px',
          maxWidth: '250px',
        }}
      >
        <div style={{ fontSize: '24px', marginRight: '12px' }}>
          {getFileIcon(attachment.mimeType)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#333',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {attachment.originalName || attachment.filename || 'Unknown file'}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#666',
          }}>
            {formatFileSize(attachment.size)}
          </div>
        </div>
      </div>
    );
  };

  const renderMessage = (message) => {
    const senderId = message.sender?._id || message.sender?.id;
    const isOwnMessage = senderId === currentUserId;
    const messageTime = formatTime(message.timestamp);

    return (
      <div
        key={message._id || message.id}
        className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
          marginBottom: '1px',
          padding: '0 4px',
        }}
      >
        <div
          className="message-bubble"
          style={{
            maxWidth: '70%',
            padding: '6px 7px 8px 9px',
            borderRadius: isOwnMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            backgroundColor: isOwnMessage ? '#DCF8C6' : '#FFFFFF',
            border: 'none',
            position: 'relative',
            wordWrap: 'break-word',
            fontSize: '14px',
            lineHeight: '19px',
            boxShadow: '0 1px 0.5px rgba(0, 0, 0, 0.13)',
          }}
        >
          {!isOwnMessage && isGroupChat && (
            <div
              className="sender-name"
              style={{
                fontSize: '12px',
                color: '#25D366',
                fontWeight: '600',
                marginBottom: '2px',
              }}
            >
              {message.sender?.name || 'Unknown'}
            </div>
          )}
          
          {/* Render file attachment if present */}
          {message.attachment && renderFileAttachment(message.attachment, message.messageType)}
          
          {/* Render text content if present */}
          {message.content && (
            <div className="message-content">
              {message.content}
            </div>
          )}
          
          {/* Time inside bubble for all messages */}
          <div
            className="message-time"
            style={{
              fontSize: '11px',
              color: 'rgba(0, 0, 0, 0.45)',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '4px',
              width: '100%',
            }}
          >
            <span style={{ flexShrink: 0 }}>{messageTime}</span>
            {isOwnMessage && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '16px',
                  flexShrink: 0,
                }}
              >
                {/* WhatsApp-style double checkmarks */}
                {message.isRead ? (
                  <span style={{ 
                    position: 'relative',
                    width: '18px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ 
                      position: 'absolute', 
                      left: '0px',
                      color: '#53BDEB',
                      fontSize: '14px',
                      lineHeight: '1'
                    }}>✓</span>
                    <span style={{ 
                      position: 'absolute', 
                      left: '3px',
                      color: '#53BDEB',
                      fontSize: '14px',
                      lineHeight: '1'
                    }}>✓</span>
                  </span>
                ) : (
                  <span style={{ 
                    color: 'rgba(0, 0, 0, 0.45)',
                    fontSize: '14px',
                    lineHeight: '1'
                  }}>✓</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Filter out empty messages and debug
  const validMessages = messages?.filter(msg => 
    msg && (msg.content || msg.attachment) && (msg.content?.trim() || msg.attachment)
  ) || [];
  
  console.log('📨 MessageList - Messages array:', {
    originalMessages: messages,
    originalLength: messages?.length,
    validMessages: validMessages,
    validLength: validMessages.length,
    hasValidMessages: validMessages.length > 0,
    firstMessage: validMessages?.[0],
    lastMessage: validMessages?.[validMessages.length - 1]
  });

  if (!validMessages || validMessages.length === 0) {
    console.log('📭 MessageList - No valid messages found, showing empty state');
    return (
      <div
        className="empty-messages"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#999',
          fontSize: '14px',
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          {isConnected ? '💬' : '🔌'}
        </div>
        <div>
          {isConnected 
            ? receiver 
              ? `Start a conversation with ${receiver.name}`
              : 'Select a chat to view messages'
            : 'Connecting to chat server...'
          }
        </div>
      </div>
    );
  }

  return (
    <div 
      className="message-list" 
      style={{ 
        height: '100%', 
        overflow: 'auto',
        scrollbarWidth: 'none', /* Firefox */
        msOverflowStyle: 'none', /* Internet Explorer 10+ */
      }}
    >
      <style jsx>{`
        .message-list::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }
      `}</style>
      {validMessages.map(renderMessage)}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
