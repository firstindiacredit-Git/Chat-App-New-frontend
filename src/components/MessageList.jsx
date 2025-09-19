import React, { useEffect, useRef, useState, Fragment } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { API_CONFIG } from '../config/mobileConfig';

const MessageList = ({ messages, currentUserId, receiver, onMessageReceived, isUserInChat = true, isGroupChat = false, onUserNameClick }) => {
  const messagesEndRef = useRef(null);
  const { socket, isConnected } = useSocket();
  
  // State for message actions
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [messagesState, setMessagesState] = useState(messages || []);
  const [longPressMessage, setLongPressMessage] = useState(null); // Track which message is being long-pressed

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Update messages state when props change
  useEffect(() => {
    setMessagesState(messages || []);
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messagesState]);

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

      const handleMessageDeleted = (data) => {
        console.log('Message deleted:', data);
        const { messageId, deletedMessage } = data;
        
        setMessagesState(prev => prev.map(msg => {
          if ((msg._id || msg.id) === messageId) {
            return {
              ...msg,
              ...deletedMessage,
              isDeleted: true,
              content: "This message was deleted",
              messageType: "deleted"
            };
          }
          return msg;
        }));
      };

      const handleReactionAdded = (data) => {
        console.log('Reaction added:', data);
        const { messageId, reactions } = data;
        
        setMessagesState(prev => prev.map(msg => {
          if ((msg._id || msg.id) === messageId) {
            return {
              ...msg,
              reactions: reactions || []
            };
          }
          return msg;
        }));
      };

      const handleReactionRemoved = (data) => {
        console.log('Reaction removed:', data);
        const { messageId, reactions } = data;
        
        setMessagesState(prev => prev.map(msg => {
          if ((msg._id || msg.id) === messageId) {
            return {
              ...msg,
              reactions: reactions || []
            };
          }
          return msg;
        }));
      };

      socket.on('new-message', handleNewMessage);
      socket.on('message-read', handleMessageRead);
      socket.on('message-deleted', handleMessageDeleted);
      socket.on('reaction-added', handleReactionAdded);
      socket.on('reaction-removed', handleReactionRemoved);

      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('message-read', handleMessageRead);
        socket.off('message-deleted', handleMessageDeleted);
        socket.off('reaction-added', handleReactionAdded);
        socket.off('reaction-removed', handleReactionRemoved);
      };
    }
  }, [socket, isConnected, currentUserId, receiver?.id, onMessageReceived]);

  // Long press handlers
  const handleLongPressStart = (message, event) => {
    // Immediately highlight the message being pressed
    setLongPressMessage(message);
    
    const timer = setTimeout(() => {
      // Add haptic feedback for mobile devices
      if (navigator.vibrate) {
        navigator.vibrate(50); // Short vibration
      }
      
      const rect = event.target.getBoundingClientRect();
      setContextMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setSelectedMessage(message);
      setShowContextMenu(true);
      setLongPressMessage(null); // Remove highlight when context menu appears
    }, 1500); // 1.5 seconds for long press (like WhatsApp)
    
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    // Remove highlight if long press was cancelled
    setLongPressMessage(null);
  };

  // Close context menu
  const closeContextMenu = () => {
    setShowContextMenu(false);
    setSelectedMessage(null);
    setLongPressMessage(null);
  };

  // Reaction handlers
  const handleAddReaction = async (messageId, reaction = "👍") => {
    if (!socket || !isConnected) return;
    
    try {
      socket.emit('add-reaction', {
        messageId: messageId,
        reaction: reaction
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId) => {
    if (!socket || !isConnected) return;
    
    try {
      socket.emit('remove-reaction', {
        messageId: messageId
      });
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  // Delete message handler
  const handleDeleteMessage = async () => {
    if (!selectedMessage || !socket || !isConnected) return;
    
    const messageId = selectedMessage._id || selectedMessage.id;
    
    // Check if this is a temporary message
    if (messageId && messageId.toString().startsWith('temp-')) {
      console.log('🗑️ Frontend: Attempting to delete temporary message, removing locally:', messageId);
      // Remove temporary message locally
      setMessagesState(prev => prev.filter(msg => 
        (msg._id || msg.id) !== messageId
      ));
      closeContextMenu();
      setShowDeleteModal(false);
      return;
    }
    
    console.log('🗑️ Frontend: Attempting to delete message:', {
      messageId,
      selectedMessage,
      currentUserId,
      messageSenderId: selectedMessage.sender?._id || selectedMessage.sender?.id,
      isOwnMessage: (selectedMessage.sender?._id === currentUserId || selectedMessage.sender?.id === currentUserId),
      isTemporary: selectedMessage.isTemporary
    });
    
    try {
      socket.emit('delete-message', {
        messageId: messageId
      });
      
      closeContextMenu();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Handle context menu actions
  const handleContextMenuAction = (action, reaction = "👍") => {
    const messageId = selectedMessage._id || selectedMessage.id;
    
    switch (action) {
      case 'like':
        handleAddReaction(messageId, reaction);
        closeContextMenu();
        break;
      case 'delete':
        setShowDeleteModal(true);
        break;
      default:
        closeContextMenu();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Check if it's within this week
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    if (date > weekAgo) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // For older dates
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() === d2.toDateString();
  };

  const renderDateSeparator = (date) => {
    return (
      <div
        key={`date-${date}`}
        className="date-separator"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '16px 0 8px 0',
          position: 'relative',
        }}
      >
        <div
          style={{
            backgroundColor: '#E3F2FD',
            color: '#1976D2',
            padding: '4px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            textAlign: 'center',
            border: '1px solid #BBDEFB',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          {formatDate(date)}
        </div>
      </div>
    );
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
    const messageId = message._id || message.id;
    const userReaction = message.reactions?.find(r => r.user?._id === currentUserId || r.user?.id === currentUserId);
    const isDeleted = message.isDeleted || message.messageType === 'deleted';
    const isSystemMessage = message.messageType === 'system';
    const isLongPressed = longPressMessage && (longPressMessage._id || longPressMessage.id) === messageId;

    // Render system messages differently
    if (isSystemMessage) {
      return (
        <div
          key={messageId}
          className="system-message"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '8px 0',
            padding: '0 16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#E3F2FD',
              color: '#1976D2',
              padding: '6px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              textAlign: 'center',
              border: '1px solid #BBDEFB',
              maxWidth: '80%',
              wordWrap: 'break-word',
            }}
          >
            🔒 {message.content}
          </div>
        </div>
      );
    }

    return (
      <div
        key={messageId}
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
            backgroundColor: isLongPressed 
              ? (isOwnMessage ? '#B8E6B8' : '#E8E8E8') // Darker shade when long-pressed
              : isDeleted 
                ? '#F0F0F0' 
                : (isOwnMessage ? '#DCF8C6' : '#FFFFFF'),
            border: isLongPressed 
              ? '2px solid #25D366' // Green border when selected
              : 'none',
            position: 'relative',
            wordWrap: 'break-word',
            fontSize: '14px',
            lineHeight: '19px',
            boxShadow: isLongPressed 
              ? '0 4px 12px rgba(37, 211, 102, 0.3)' // Enhanced shadow when selected
              : '0 1px 0.5px rgba(0, 0, 0, 0.13)',
            opacity: isDeleted ? 0.7 : 1,
            transform: isLongPressed ? 'scale(1.02)' : 'scale(1)', // Slight scale up when selected
            transition: 'all 0.2s ease-in-out', // Smooth transition
            marginBottom: message.reactions && message.reactions.length > 0 ? '14px' : '0', // More space for lower reactions
          }}
          onTouchStart={(e) => !isDeleted && handleLongPressStart(message, e)}
          onTouchEnd={handleLongPressEnd}
          onMouseDown={(e) => !isDeleted && handleLongPressStart(message, e)}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
        >
          {!isOwnMessage && (isGroupChat || onUserNameClick) && (
            <div
              className="sender-name"
              style={{
                fontSize: '12px',
                color: '#25D366',
                fontWeight: '600',
                marginBottom: '2px',
                cursor: onUserNameClick ? 'pointer' : 'default',
                textDecoration: onUserNameClick ? 'none' : 'none',
                transition: 'all 0.2s ease',
              }}
              onClick={() => {
                if (onUserNameClick && message.sender) {
                  onUserNameClick(message.sender);
                }
              }}
              onMouseEnter={(e) => {
                if (onUserNameClick) {
                  e.target.style.textDecoration = 'underline';
                  e.target.style.color = '#128C7E';
                }
              }}
              onMouseLeave={(e) => {
                if (onUserNameClick) {
                  e.target.style.textDecoration = 'none';
                  e.target.style.color = '#25D366';
                }
              }}
            >
              {message.sender?.name || 'Unknown'}
            </div>
          )}
          
          {/* Render file attachment if present */}
          {!isDeleted && message.attachment && renderFileAttachment(message.attachment, message.messageType)}
          
          {/* Render text content if present */}
          {message.content && (
            <div className="message-content" style={{
              fontStyle: isDeleted ? 'italic' : 'normal',
              color: isDeleted ? '#666' : 'inherit'
            }}>
              {isDeleted && '🚫 '}{message.content}
            </div>
          )}
          
          {/* Time and read status */}
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
            {isOwnMessage && !isDeleted && (
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

          {/* Reactions display - Overlapping bubble */}
          {message.reactions && message.reactions.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '-12px', // More outside the bubble, lower from time
              [isOwnMessage ? 'right' : 'left']: '8px', // Position based on message alignment
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              zIndex: 10, // Ensure reactions appear above other elements
            }}>
              {message.reactions.reduce((acc, reaction) => {
                const existingReaction = acc.find(r => r.reaction === reaction.reaction);
                if (existingReaction) {
                  existingReaction.count++;
                  existingReaction.users.push(reaction.user);
                } else {
                  acc.push({
                    reaction: reaction.reaction,
                    count: 1,
                    users: [reaction.user]
                  });
                }
                return acc;
              }, []).map((reactionGroup, index) => (
                <span
                  key={index}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '2px 6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    border: userReaction?.reaction === reactionGroup.reaction 
                      ? '' 
                      : '1px solid rgba(0, 0, 0, 0.2)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.2s ease',
                    minHeight: '23px',
                  }}
                  onClick={() => {
                    if (userReaction?.reaction === reactionGroup.reaction) {
                      handleRemoveReaction(messageId);
                    } else {
                      handleAddReaction(messageId, reactionGroup.reaction);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
                  }}
                  title={`${reactionGroup.users.map(u => u.name).join(', ')}`}
                >
                  {reactionGroup.reaction} {reactionGroup.count > 1 && reactionGroup.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Filter out empty messages and debug
  const validMessages = messagesState?.filter(msg => 
    msg && (msg.content || msg.attachment) && (msg.content?.trim() || msg.attachment)
  ) || [];
  
  console.log('📨 MessageList - Messages array:', {
    originalMessages: messagesState,
    originalLength: messagesState?.length,
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
    <>
      <div 
        className="message-list" 
        style={{ 
          height: '90%', 
          overflow: 'auto',
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* Internet Explorer 10+ */
        }}
      >
        <style>{`
          .message-list::-webkit-scrollbar {
            display: none; /* Safari and Chrome */
          }
        `}</style>
        {validMessages.map((message, index) => {
          const currentMessageDate = message.timestamp;
          const previousMessage = index > 0 ? validMessages[index - 1] : null;
          const previousMessageDate = previousMessage ? previousMessage.timestamp : null;
          
          // Show date separator if this is the first message or if the date is different from previous message
          const showDateSeparator = index === 0 || !isSameDay(currentMessageDate, previousMessageDate);
          
          return (
            <Fragment key={message._id || message.id}>
              {showDateSeparator && renderDateSeparator(currentMessageDate)}
              {renderMessage(message)}
            </Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp-style context menu */}
      {showContextMenu && selectedMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={closeContextMenu}
        >
          <div
            style={{
              position: 'absolute',
              top: contextMenuPosition.y,
              left: Math.max(10, Math.min(contextMenuPosition.x - 100, window.innerWidth - 210)),
              backgroundColor: 'white',
              borderRadius: '12px',
              
              minWidth: '200px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: '1px solid #e0e0e0',
              animation: 'contextMenuSlideIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes contextMenuSlideIn {
                from {
                  opacity: 0;
                  transform: translateY(-10px) scale(0.95);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}</style>

            {/* Reaction options */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                padding: '8px 12px 4px', 
                fontWeight: '500' 
              }}>
               
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '3px', 
                padding: '4px 12px 8px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleContextMenuAction('like', emoji)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '8px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Action options */}
            <div>
              {(() => {
                const senderId = selectedMessage?.sender?._id || selectedMessage?.sender?.id;
                const messageId = selectedMessage?._id || selectedMessage?.id;
                const isOwnMessage = senderId === currentUserId || senderId?.toString() === currentUserId?.toString();
                const isTemporary = selectedMessage?.isTemporary || messageId?.toString().startsWith('temp-');
                const isDeleted = selectedMessage?.isDeleted || selectedMessage?.messageType === 'deleted';
                
                console.log('🔍 Delete button condition check:', {
                  selectedMessage,
                  currentUserId,
                  senderId,
                  isOwnMessage,
                  isTemporary,
                  isDeleted,
                  messageId,
                  showDelete: isOwnMessage && !isTemporary && !isDeleted
                });
                
                return isOwnMessage && !isTemporary && !isDeleted;
              })() && (
                <button
                  onClick={() => handleContextMenuAction('delete')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#ff4757',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    textAlign: 'left',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#fff5f5'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  Delete Message
                </button>
              )}
              
              {/* Debug: Always show delete button to test */}
              {!(() => {
                const senderId = selectedMessage?.sender?._id || selectedMessage?.sender?.id;
                const messageId = selectedMessage?._id || selectedMessage?.id;
                const isOwnMessage = senderId === currentUserId || senderId?.toString() === currentUserId?.toString();
                const isTemporary = selectedMessage?.isTemporary || messageId?.toString().startsWith('temp-');
                const isDeleted = selectedMessage?.isDeleted || selectedMessage?.messageType === 'deleted';
                return isOwnMessage && !isTemporary && !isDeleted;
              })() && selectedMessage && (
                <button
                  onClick={() => handleContextMenuAction('delete')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#ff9999',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    textAlign: 'left',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#fff5f5'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  🗑️ Debug Delete (Not Own Message)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && selectedMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowDeleteModal(false);
            closeContextMenu();
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '300px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              Delete Message
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  closeContextMenu();
                }}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMessage}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#ff4757',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageList;
