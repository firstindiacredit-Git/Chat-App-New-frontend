import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_CONFIG } from '../config/mobileConfig';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (user && user.token) {
      console.log('🔌 Initializing socket connection for user:', user.name);
      
      // Initialize socket connection
      const newSocket = io(API_CONFIG.SOCKET_URL, {
        auth: {
          token: user.token,
        },
        autoConnect: true,
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('✅ Socket connected - ID:', newSocket.id);
        console.log('👤 Connected as user:', user.name);
        console.log('🔗 Connection URL:', newSocket.io.uri);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected - Reason:', reason);
        console.log('👤 Disconnected user:', user.name);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection error:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnection failed');
        setIsConnected(false);
      });

      // User online/offline events
      newSocket.on('user-online', (data) => {
        console.log('🟢 User came online:', data.user.name);
        setOnlineUsers(prev => {
          const exists = prev.find(u => u.userId === data.userId);
          if (exists) {
            return prev.map(u => 
              u.userId === data.userId 
                ? { ...u, isOnline: true, lastSeen: new Date() }
                : u
            );
          }
          return [...prev, { ...data, isOnline: true, lastSeen: new Date() }];
        });
      });

      newSocket.on('user-offline', (data) => {
        console.log('🔴 User went offline:', data.user.name);
        setOnlineUsers(prev => {
          const exists = prev.find(u => u.userId === data.userId);
          if (exists) {
            return prev.map(u => 
              u.userId === data.userId 
                ? { ...u, isOnline: false, lastSeen: new Date() }
                : u
            );
          }
          return prev;
        });
      });

      // Receive initial online users list
      newSocket.on('online-users', (users) => {
        console.log('👥 Initial online users:', users.map(u => u.user.name));
        setOnlineUsers(users.map(user => ({ ...user, isOnline: true, lastSeen: new Date() })));
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      };
    } else {
      // Disconnect socket if no user
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      }
    }
  }, [user?.token, user?.id]);

  const sendMessage = (receiverId, content, messageType = 'text', isGroupChat = false, attachment = null) => {
    console.log('📤 sendMessage called with:', { receiverId, content, messageType, isGroupChat, attachment });
    console.log('📤 Socket status:', { socket: !!socket, isConnected, socketId: socket?.id });
    
    if (socket && isConnected) {
      console.log('📤 Emitting send-message event...');
      
      const messageData = {
        receiverId,
        content,
        messageType,
        isGroupChat,
      };
      
      // Add attachment if provided
      if (attachment) {
        messageData.attachment = attachment;
        console.log('📎 Adding attachment to message:', attachment);
      }
      
      socket.emit('send-message', messageData);
      console.log('✅ send-message event emitted successfully with data:', messageData);
    } else {
      console.error('❌ Cannot send message: Socket not connected');
      console.error('❌ Socket status:', { socket: !!socket, isConnected });
      throw new Error('Socket not connected. Please check your connection.');
    }
  };

  const markMessageRead = (messageId, senderId) => {
    if (socket && isConnected) {
      socket.emit('mark-message-read', {
        messageId,
        senderId,
      });
    }
  };

  const startTyping = (receiverId) => {
    if (socket && isConnected) {
      socket.emit('typing-start', { receiverId });
    }
  };

  const stopTyping = (receiverId) => {
    if (socket && isConnected) {
      socket.emit('typing-stop', { receiverId });
    }
  };

  const isUserOnline = (userId) => {
    const onlineUser = onlineUsers.find(u => u.userId === userId);
    return onlineUser ? onlineUser.isOnline : false;
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    sendMessage,
    markMessageRead,
    startTyping,
    stopTyping,
    isUserOnline,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
