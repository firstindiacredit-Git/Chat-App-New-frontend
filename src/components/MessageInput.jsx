import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext'
import { API_CONFIG } from '../config/mobileConfig';

const MessageInput = ({ receiverId, onMessageSent, disabled = false, currentUserId, isGroupChat = false, userToken }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const { sendMessage, startTyping, stopTyping } = useSocket();

  const handleSendMessage = async () => {
    if ((!message.trim() && !selectedFile) || !receiverId || disabled) return;

    const messageToSend = message.trim();
    let attachment = null;
    
    try {
      // If there's a file to upload, upload it first
      if (selectedFile) {
        console.log('📎 File selected for upload:', selectedFile.name, selectedFile.type, selectedFile.size);
        setIsUploading(true);
        
        try {
          attachment = await uploadFile(selectedFile);
          console.log('✅ File uploaded successfully:', attachment);
          
          // Send message with attachment via socket
          console.log('📤 Sending message with attachment via socket:', { 
            receiverId, 
            messageToSend, 
            attachment,
            messageType: attachment.type,
            isGroupChat 
          });
          sendMessage(receiverId, messageToSend, attachment.type, isGroupChat, attachment);
        } catch (uploadError) {
          console.error('❌ File upload failed:', uploadError);
          setIsUploading(false);
          throw new Error(`File upload failed: ${uploadError.message}`);
        }
      } else {
        // Send text message via socket
        console.log('📤 Sending text message via socket:', { receiverId, messageToSend, isGroupChat });
        console.log('📤 Socket context:', { sendMessage: typeof sendMessage, isConnected: true });
        sendMessage(receiverId, messageToSend, 'text', isGroupChat);
      }
      
      // Create temporary message for immediate UI update
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        content: messageToSend,
        sender: { _id: currentUserId, name: 'You' },
        receiver: { _id: receiverId },
        timestamp: new Date(),
        messageType: selectedFile ? attachment.type : 'text',
        attachment: selectedFile ? attachment : null,
        isTemporary: true,
        isRead: false
      };
      
      // Add temporary message to UI immediately
      if (onMessageSent) {
        onMessageSent(tempMessage);
      }
      
      // Clear input and reset state
      setMessage('');
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Stop typing indicator
      stopTyping(receiverId);
      setIsTyping(false);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }

      console.log('📤 Message sent:', messageToSend || 'File message');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        receiverId,
        messageToSend,
        selectedFile: !!selectedFile
      });
      setIsUploading(false);
      
      // Show user-friendly error message
      alert(`Failed to send message: ${error.message}`);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    // Try multiple ways to get token
    let token = userToken || 
                localStorage.getItem('token') || 
                localStorage.getItem('authToken') || 
                sessionStorage.getItem('token') ||
                sessionStorage.getItem('authToken');
    
    console.log('🔑 Upload token check:');
    console.log('🔑 localStorage token:', localStorage.getItem('token') ? 'Exists' : 'Not found');
    console.log('🔑 sessionStorage token:', sessionStorage.getItem('token') ? 'Exists' : 'Not found');
    console.log('🔑 Final token:', token ? 'Found' : 'Not found');
    console.log('🔑 Token length:', token ? token.length : 0);
    
    if (!token) {
      console.log('❌ No token found in any storage');
      throw new Error('No authentication token found. Please login again.');
    }

    const response = await fetch(`${API_CONFIG.API_URL}/upload/file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Upload error response:', errorData);
      throw new Error(errorData.message || 'File upload failed');
    }

    const result = await response.json();
    console.log('✅ Upload successful:', result);
    
    // Return attachment object with proper structure
    const backendUrl = API_CONFIG.BASE_URL;
    
    const fullUrl = result.data.url.startsWith('http') ? result.data.url : `${backendUrl}${result.data.url}`;
    const fullThumbnailUrl = result.data.thumbnail ? 
      (result.data.thumbnail.startsWith('http') ? result.data.thumbnail : `${backendUrl}${result.data.thumbnail}`) : 
      null;
    
    const attachmentData = {
      url: fullUrl,
      filename: result.data.filename,
      originalName: result.data.originalName,
      mimeType: result.data.mimeType,
      size: result.data.size,
      thumbnail: fullThumbnailUrl,
      type: result.data.type,
      localPath: result.data.localPath // Store local path for reference
    };
    
    console.log('📎 Attachment data (Local URL):', attachmentData);
    console.log('📁 Local File URL:', attachmentData.url);
    return attachmentData;
  };


  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    // Typing indicators
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      startTyping(receiverId);
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing indicator
    const timeout = setTimeout(() => {
      setIsTyping(false);
      stopTyping(receiverId);
      setTypingTimeout(null);
    }, 1000);

    setTypingTimeout(timeout);
  };

  const handleInputBlur = () => {
    // Stop typing when input loses focus
    if (isTyping) {
      setIsTyping(false);
      stopTyping(receiverId);
    }
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('File type not supported');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  return (
    <div className="message-input-container">
      {/* File Preview */}
      {selectedFile && (
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid #E0E0E0',
          backgroundColor: '#F5F5F5',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #E0E0E0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    width: '40px',
                    height: '40px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    marginRight: '12px',
                  }}
                />
              ) : (
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#E0E0E0',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                }}>
                  📎
                </div>
              )}
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>
            <button
              onClick={removeSelectedFile}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div 
        className="message-input-wrapper"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: dragOver ? '2px dashed #25D366' : 'none',
          borderRadius: dragOver ? '8px' : '0',
          backgroundColor: 'transparent',
        }}
      >
        <div className="message-input-field" style={{ 
          display: 'flex', 
          alignItems: 'center',
          width: '100%',
          gap: '8px'
        }}>
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: '8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Attach file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onBlur={handleInputBlur}
            placeholder={"Type a message..."}
            disabled={disabled}
            rows={1}
            style={{
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              overflow: 'auto',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              flex: 1,
              width: '100%',
              fontSize: '14px',
              lineHeight: '20px',
              padding: '12px 0',
              fontFamily: 'inherit',
            }}
          />
        </div>
        
        <button
          onClick={handleSendMessage}
          disabled={(!message.trim() && !selectedFile) || !receiverId || disabled || isUploading}
          className="send-button"
          style={{
            backgroundColor: (message.trim() || selectedFile) && receiverId && !disabled && !isUploading ? '#25D366' : '#E0E0E0',
            color: (message.trim() || selectedFile) && receiverId && !disabled && !isUploading ? 'white' : '#9E9E9E',
            border: 'none',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (message.trim() || selectedFile) && receiverId && !disabled && !isUploading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          {isUploading ? (
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #ffffff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
      />

      {/* Drag overlay */}
      {dragOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(37, 211, 102, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: '#25D366',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          Drop file here to attach
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MessageInput;
