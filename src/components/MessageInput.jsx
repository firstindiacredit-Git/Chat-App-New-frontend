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
    <div className="bg-transparent border border-gray-400 rounded-full relative">
      {/* File Preview */}
      {selectedFile && (
        <div className="px-2 py-1 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center flex-1">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-10 h-10 object-cover rounded mr-3"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center mr-3 text-lg">
                  📎
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>
            <button
              onClick={removeSelectedFile}
              className="ml-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div 
        className={`px-4 py-3 transition-all duration-200 ${
          dragOver ? 'border-2 border-dashed border-green-500 rounded-lg bg-green-50' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-end gap-3 max-w-full">
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={`
              p-2 rounded-full transition-all duration-200 flex-shrink-0
              ${disabled 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-500 hover:text-green-600 hover:bg-gray-100 cursor-pointer'
              }
            `}
            title="Attach file"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>
          </button>

          {/* Message Input Container */}
          <div className="flex-1 relative">
            <div className="bg-gray-100 rounded-3xl px-4 py-2 min-h-[44px] flex items-center border border-gray-200 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onBlur={handleInputBlur}
                placeholder="Type a message..."
                disabled={disabled}
                rows={1}
                className={`
                  w-full resize-none border-none outline-none bg-transparent
                  text-gray-900 placeholder-gray-500 text-sm leading-5
                  min-h-[20px] max-h-[100px] overflow-auto
                  ${disabled ? 'cursor-not-allowed text-gray-400' : ''}
                `}
                style={{
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={(!message.trim() && !selectedFile) || !receiverId || disabled || isUploading}
            className={`
              w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0
              ${(message.trim() || selectedFile) && receiverId && !disabled && !isUploading
                ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
            title="Send message"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="transform rotate-0"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
      />

      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 bg-green-50 flex items-center justify-center text-green-600 font-medium text-base pointer-events-none z-10 rounded-lg border-2 border-dashed border-green-500">
          📎 Drop file here to attach
        </div>
      )}
    </div>
  );
};

export default MessageInput;
