import React, { useState, useEffect, useRef } from 'react'
import { API_CONFIG } from '../config/mobileConfig'
import { Link } from 'react-router-dom'
import Header from './Header'
import AvatarUpload from './AvatarUpload'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import Story from './Story'
import GroupManagement from './GroupManagement'
import CallHistory from './CallHistory'
import CallButton from './CallButton'
import JitsiMeet from './JitsiMeet'
import MobileLayout from './MobileLayout'
import { useSocket } from '../contexts/SocketContext'
import { isMobilePlatform } from '../utils/mobilePermissions'

const Chat = ({ user, onLogout }) => {
  const { socket, isConnected, isUserOnline } = useSocket()
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [currentUser, setCurrentUser] = useState(user)
  const [notifications, setNotifications] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [viewingUsers, setViewingUsers] = useState({}) // Track who is viewing which chat
  const [activeTab, setActiveTab] = useState('chats') // Tab state: chats, stories, groups, calls
  const [showStoryComponent, setShowStoryComponent] = useState(false)
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupMessages, setGroupMessages] = useState([])
  const [showGroupManagement, setShowGroupManagement] = useState(false)
  const [showGroupDetails, setShowGroupDetails] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState([])
  const [activeCall, setActiveCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const messagesEndRef = useRef(null)

  // Show notification for new message
  const showNotification = (senderName, messageContent) => {
    const notification = {
      id: Date.now(),
      message: `New message from ${senderName}: ${messageContent}`,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Update unread count for a specific user
  // Unread count is now managed by backend - no local state needed

  // Mark messages as read when user opens a chat
  const markMessagesAsRead = async (receiverId) => {
    try {
      const response = await fetch(`${API_CONFIG.API_URL}/messages/mark-read/${receiverId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Messages marked as read for user:', receiverId);
        // Refresh chat rooms to update unread counts
        fetchChatRooms();
      } else {
        console.error('❌ Failed to mark messages as read');
      }
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  };

  // Notify backend that user is viewing a specific chat
  const notifyUserViewingChat = (chatUserId, isViewing) => {
    if (socket && isConnected) {
      socket.emit('user-viewing-chat', {
        chatUserId: chatUserId,
        isViewing: isViewing
      });
      console.log(`👁️ User ${isViewing ? 'viewing' : 'stopped viewing'} chat with user:`, chatUserId);
    }
  };

  // Fetch groups from API
  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_CONFIG.API_URL}/groups`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        setGroups(data.data.groups)
      } else {
        console.error('Failed to fetch groups:', data.message)
        setGroups([])
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      setGroups([])
    }
  }

  // Fetch group messages
  const fetchGroupMessages = async (groupId) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_CONFIG.API_URL}/groups/${groupId}/messages`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        setGroupMessages(data.data.messages)
      } else {
        console.error('Failed to fetch group messages:', data.message)
        setGroupMessages([])
      }
    } catch (error) {
      console.error('Error fetching group messages:', error)
      setGroupMessages([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch available users for adding to group
  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(`${API_CONFIG.API_URL}/auth/users`)
      const data = await response.json()    

      if (data.success) {
        // Filter out users who are already in the group
        const currentMemberIds = selectedGroup?.members?.map(member => member._id) || []
        const availableUsers = data.data.users.filter(userData => 
          userData._id !== currentUser.id && !currentMemberIds.includes(userData._id)
        )
        setAvailableUsers(availableUsers)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  // Add members to group
  const addMembersToGroup = async () => {
    if (selectedUsersToAdd.length === 0) {
      alert('Please select at least one user to add')
      return
    }

    try {
      const response = await fetch(`${API_CONFIG.API_URL}/groups/${selectedGroup._id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberIds: selectedUsersToAdd
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update the selected group with new members
        setSelectedGroup(data.data.group)
        // Refresh groups list
        fetchGroups()
        // Close add members modal
        setShowAddMembers(false)
        setSelectedUsersToAdd([])
        alert('Members added successfully!')
      } else {
        alert(data.message || 'Failed to add members')
      }
    } catch (err) {
      alert('Failed to add members. Please try again.')
    }
  }

  // Remove member from group
  const removeMemberFromGroup = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) {
      return
    }

    try {
      const response = await fetch(`${API_CONFIG.API_URL}/groups/${selectedGroup._id}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        // Refresh groups list and selected group
        fetchGroups()
        // Fetch updated group details
        const groupResponse = await fetch(`${API_CONFIG.API_URL}/groups/${selectedGroup._id}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        })
        const groupData = await groupResponse.json()
        if (groupData.success) {
          setSelectedGroup(groupData.data.group)
        }
        alert('Member removed successfully!')
      } else {
        alert(data.message || 'Failed to remove member')
      }
    } catch (err) {
      alert('Failed to remove member. Please try again.')
    }
  }

  // Fetch chat rooms from API
  const fetchChatRooms = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_CONFIG.API_URL}/messages/chatrooms`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })
      
      const data = await response.json()
      
       if (data.success) {
         // Transform chat rooms to match expected format
         const transformedChats = data.data.chatRooms.map(chatRoom => {
           const userId = chatRoom.otherUser.id;
           const apiUnreadCount = chatRoom.unreadCount || 0;
           
           console.log(`📊 Unread count for ${chatRoom.otherUser.name}: ${apiUnreadCount}`);
           
           // Log when unread count changes
           if (apiUnreadCount > 0) {
             console.log(`🔔 ${chatRoom.otherUser.name} has ${apiUnreadCount} unread message${apiUnreadCount > 1 ? 's' : ''}`);
           }
           
           return {
             id: userId,
             name: chatRoom.otherUser.name,
             avatar: chatRoom.otherUser.avatar || '',
             lastMessage: chatRoom.lastMessage ? chatRoom.lastMessage.content : '',
             time: chatRoom.lastMessage ? chatRoom.lastMessage.timestamp : '',
             unread: apiUnreadCount,
             online: isUserOnline(userId),
             type: 'private' // Mark as private chat
           };
         })
         
         // Add group chats to the main chats list
         const groupChats = groups.map(group => ({
           id: group._id,
           name: group.name,
           avatar: group.avatar || '',
           lastMessage: group.lastMessage ? 
             (group.lastMessage.messageType === 'system' ? 
               group.lastMessage.content : 
               `${group.lastMessage.sender?.name}: ${group.lastMessage.content}`
             ) : 'No messages yet',
           time: group.lastActivity || '',
           unread: group.unreadCount || 0,
           online: false, // Groups don't have online status
           type: 'group', // Mark as group chat
           groupData: group // Store full group data
         }))
         
         // Combine private chats and group chats, sort by last activity
         const allChats = [...transformedChats, ...groupChats].sort((a, b) => {
           const timeA = new Date(a.time).getTime()
           const timeB = new Date(b.time).getTime()
           return timeB - timeA // Most recent first
         })
         
         setChats(allChats)
      } else {
        console.error('Failed to fetch chat rooms:', data.message)
        setChats([])
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error)
      setChats([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch messages for a specific chat
  const fetchMessages = async (receiverId) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_CONFIG.API_URL}/messages/chat/${receiverId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('📨 Chat - Fetched messages:', {
          count: data.data.messages.length,
          messages: data.data.messages,
          hasFileMessages: data.data.messages.some(msg => msg.attachment)
        });
        setMessages(data.data.messages)
      } else {
        console.error('Failed to fetch messages:', data.message)
        setMessages([])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  // Check for selected chat from user list and fetch chat rooms
  useEffect(() => {
    const savedChat = localStorage.getItem('selectedChat')
    if (savedChat) {
      const chatData = JSON.parse(savedChat)
      setSelectedChat(chatData)
      localStorage.removeItem('selectedChat') // Clear after use
    }
    
    // Fetch chat rooms and groups on component mount
    fetchChatRooms()
    fetchGroups()
    
    // Auto-refresh unread counts every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing chat rooms and groups for unread counts')
      fetchChatRooms()
      fetchGroups()
    }, 30000)
    
    // Refresh when user comes back to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ User returned to tab - refreshing chat rooms and groups')
        fetchChatRooms()
        fetchGroups()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (selectedChat && selectedChat.id) {
      console.log('🔄 Chat - Fetching messages for chat:', selectedChat.id);
      fetchMessages(selectedChat.id)
      // Mark messages as read when user opens the chat
      markMessagesAsRead(selectedChat.id)
      // Notify backend that user is viewing this chat
      notifyUserViewingChat(selectedChat.id, true)
    } else {
      console.log('🔄 Chat - No chat selected, clearing messages');
      setMessages([]); // Clear messages when no chat selected
      // User is not viewing any specific chat
      notifyUserViewingChat(null, false)
    }
  }, [selectedChat])

  // Fetch messages when a group is selected
  useEffect(() => {
    if (selectedGroup && selectedGroup._id) {
      fetchGroupMessages(selectedGroup._id)
    }
  }, [selectedGroup])

  // Fetch available users when add members modal is opened
  useEffect(() => {
    if (showAddMembers && selectedGroup) {
      fetchAvailableUsers()
    }
  }, [showAddMembers, selectedGroup])

  // Handle new message received
  const handleNewMessage = (newMessage) => {
    console.log('📨 handleNewMessage called with:', newMessage);
    setMessages(prev => {
      // Check if message already exists to prevent duplicates
      const exists = prev.some(msg => 
        (msg._id || msg.id) === (newMessage._id || newMessage.id)
      );
      if (exists) {
        console.log('⚠️ Message already exists in handleNewMessage, not adding duplicate');
        return prev;
      }
      console.log('✅ Adding new message via handleNewMessage');
      return [...prev, newMessage];
    });
  }

  // Handle new group message received
  const handleNewGroupMessage = (newMessage) => {
    console.log('📨 handleNewGroupMessage called with:', newMessage)
    setGroupMessages(prev => {
      console.log('📨 Adding message to group messages, current count:', prev.length)
      return [...prev, newMessage]
    })
  }

  // Handle group selection
  const handleGroupSelect = (group) => {
    setSelectedGroup(group)
    setSelectedChat(null) // Clear private chat selection
    setActiveTab('chats') // Switch to chats tab to show the group chat
  }

  // Handle message sent
  const handleMessageSent = (messageData) => {
    if (typeof messageData === 'string') {
      // Old format - just log it
      console.log('Message sent:', messageData)
    } else {
      // New format - add temporary message immediately
      console.log('📝 Adding temporary message:', messageData)
      if (messageData.isTemporary) {
        setMessages(prev => [...prev, messageData])
      }
    }
  }

  // Global socket event handlers
  useEffect(() => {
    console.log('🔌 Chat component socket effect:', { 
      socket: !!socket, 
      isConnected, 
      currentUser: currentUser?.name,
      socketId: socket?.id,
      socketConnected: socket?.connected
    });
    
    // Monitor socket connection status
    if (socket) {
      console.log('🔌 Socket connection details:', {
        id: socket.id,
        connected: socket.connected,
        disconnected: socket.disconnected,
        transport: socket.io?.engine?.transport?.name
      });
    }
    
    if (socket && isConnected) {
      const handleNewMessageSocket = (data) => {
        console.log('📨 New message received:', data)
        console.log('📨 Message details:', {
          hasAttachment: !!data.message.attachment,
          messageType: data.message.messageType,
          content: data.message.content,
          attachment: data.message.attachment
        });
        const receiverId = data.message.receiver?._id || data.message.receiver?.id;
        const senderId = data.message.sender?._id || data.message.sender?.id;
        const groupId = data.message.group?._id || data.message.group;
        
        console.log('👤 Current user ID:', currentUser.id)
        console.log('📤 Sender ID:', senderId)
        console.log('📥 Receiver ID:', receiverId)
        console.log('👥 Group ID:', groupId)
        
        // Show all messages regardless of whether they involve current user
        console.log('✅ Processing message for display')
        
        // Always refresh chat rooms to update unread counts
        console.log('🔄 Refreshing chat rooms to update unread counts')
        fetchChatRooms()
        
        // Handle group messages
        if (groupId) {
          console.log('👥 Processing group message')
          console.log('👥 Group ID from message:', groupId)
          console.log('👥 Selected group ID:', selectedGroup?._id)
          console.log('👥 Selected group:', selectedGroup)
          
          // Add message to current group chat if it matches the selected group
          if (selectedGroup && (groupId === selectedGroup._id || groupId === selectedGroup._id.toString())) {
            console.log('📝 Adding group message to current group chat')
            setGroupMessages(prev => {
              console.log('📝 Current group messages:', prev.length)
              // Remove any temporary messages first
              const filteredMessages = prev.filter(msg => !msg.isTemporary);
              
              // Check if real message already exists
              const exists = filteredMessages.some(msg => 
                (msg._id || msg.id) === (data.message._id || data.message.id)
              );
              if (exists) {
                console.log('⚠️ Group message already exists, not adding duplicate')
                return filteredMessages;
              }
              
              console.log('📝 Adding real group message to chat:', data.message.content)
              return [...filteredMessages, data.message];
            });
          } else {
            console.log('🔔 Group message from other group - showing notification')
            console.log('🔔 Group ID mismatch - current:', selectedGroup?._id, 'message:', groupId)
            // Show notification for message from other group
            const senderName = data.message.sender?.name || 'Unknown';
            const messageContent = data.message.content;
            showNotification(`Group: ${senderName}`, messageContent);
          }
          
          // Always refresh groups to update unread counts
          console.log('🔄 Refreshing groups to update unread counts')
          fetchGroups()
          return;
        }
        
        // Handle private messages - FIXED LOGIC
        // If current user is the receiver (received message)
        if (receiverId === currentUser.id) {
          console.log('📥 Received message from:', data.message.sender?.name)
          console.log('📊 Message isRead status:', data.message.isRead)
          
          // Add message to current chat if it matches the selected chat
          if (selectedChat && senderId === selectedChat.id) {
            console.log('📝 Adding received message to current chat')
            setMessages(prev => {
              // Check if message already exists to prevent duplicates
              const exists = prev.some(msg => 
                (msg._id || msg.id) === (data.message._id || data.message.id)
              );
              if (exists) {
                console.log('⚠️ Message already exists, not adding duplicate')
                return prev;
              }
              console.log('✅ Adding new received message to chat')
              return [...prev, data.message];
            });
            // Since user is in this chat, don't increment unread count
            console.log('📖 User is in this chat - no unread count needed')
          } else {
            console.log('🔔 Message from other chat - showing notification')
            // Show notification for message from other chat
            const senderName = data.message.sender?.name || 'Unknown';
            const messageContent = data.message.content;
            showNotification(senderName, messageContent);
            
            // Unread count is managed by backend based on viewing status
            if (!data.message.isRead) {
              console.log(`📭 Message not read - backend will handle unread count for ${senderName}`)
            } else {
              console.log(`📖 Message already marked as read - no unread count for ${senderName}`)
            }
          }
        }
        
        // UNIVERSAL MESSAGE HANDLER - Show ALL messages in current chat
        // This ensures real-time display for both sent and received messages
        if (selectedChat && (senderId === selectedChat.id || receiverId === selectedChat.id)) {
          console.log('📝 Universal handler - Adding message to current chat')
          console.log('📝 Message details:', {
            senderId,
            receiverId,
            selectedChatId: selectedChat.id,
            messageContent: data.message.content,
            hasAttachment: !!data.message.attachment,
            messageType: data.message.messageType,
            attachment: data.message.attachment
          });
          
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => 
              (msg._id || msg.id) === (data.message._id || data.message.id)
            );
            if (exists) {
              console.log('⚠️ Message already exists in universal handler, not adding duplicate')
              return prev;
            }
            console.log('✅ Adding message via universal handler - Message will show in real-time')
            return [...prev, data.message];
          });
        }
        
        // If current user is the sender (sent message confirmation)
        if (senderId === currentUser.id) {
          console.log('📤 Sent message confirmation received')
          console.log('📊 Sent message isRead status:', data.message.isRead)
          
          // Add message to current chat if it matches the selected chat
          if (selectedChat && receiverId === selectedChat.id) {
            console.log('📝 Adding sent message to current chat')
            setMessages(prev => {
              // Remove any temporary messages first
              const filteredMessages = prev.filter(msg => !msg.isTemporary);
              
              // Check if real message already exists
              const exists = filteredMessages.some(msg => 
                (msg._id || msg.id) === (data.message._id || data.message.id)
              );
              if (exists) {
                console.log('⚠️ Message already exists, not adding duplicate')
                return filteredMessages;
              }
              
              console.log('✅ Adding new sent message to chat with isRead:', data.message.isRead)
              return [...filteredMessages, data.message];
            });
          }
        }
        
      }

      const handleMessageSentSocket = (data) => {
        console.log('📤 Message sent confirmation received:', data)
        
        // Handle group message sent confirmation
        if (data.groupId && selectedGroup && (data.groupId === selectedGroup._id || data.groupId === selectedGroup._id.toString())) {
          console.log('📤 Group message sent confirmation for current group')
          setGroupMessages(prev => {
            // Remove any temporary messages first
            const filteredMessages = prev.filter(msg => !msg.isTemporary);
            
            // Check if real message already exists
            const exists = filteredMessages.some(msg => 
              (msg._id || msg.id) === (data.message._id || data.message.id)
            );
            if (exists) {
              console.log('⚠️ Group message already exists in sent confirmation, not adding duplicate')
              return filteredMessages;
            }
            
            console.log('📝 Adding sent group message to chat')
            return [...filteredMessages, data.message];
          });
        }
        
        // Force refresh chat rooms and groups to ensure unread counts are updated
        console.log('🔄 Force refreshing chat rooms and groups after message sent')
        setTimeout(() => {
          fetchChatRooms()
          fetchGroups()
        }, 100) // Small delay to ensure backend has processed the message
      }

      const handleMessageError = (error) => {
        console.error('❌ Message error:', error)
        console.error('❌ Socket status during error:', { 
          socket: !!socket, 
          isConnected, 
          socketId: socket?.id,
          currentUser: currentUser?.name 
        })
        console.error('❌ Error details:', {
          error: error.error,
          message: error.message,
          timestamp: new Date().toISOString()
        })
        alert('Failed to send message: ' + (error.error || error.message || 'Unknown error'))
      }

      const handleUserViewingStatus = (data) => {
        console.log('👁️ User viewing status update:', data)
        const { viewerId, viewer, isViewing, chatUserId } = data;
        
        if (isViewing && chatUserId === currentUser.id) {
          // Someone is viewing our chat
          console.log(`👁️ ${viewer.name} is viewing your chat`)
          setViewingUsers(prev => ({
            ...prev,
            [viewerId]: { viewer, isViewing: true, chatUserId }
          }));
        } else if (!isViewing) {
          // Someone stopped viewing our chat
          console.log(`👁️ ${viewer.name} stopped viewing your chat`)
          setViewingUsers(prev => {
            const updated = { ...prev };
            delete updated[viewerId];
            return updated;
          });
        }
      }

      const handleMessagesMarkedRead = (data) => {
        console.log('📖 Messages marked as read:', data)
        const { senderId, receiverId, count } = data;
        
        if (count > 0) {
          console.log(`📖 ${count} messages marked as read by receiver`)
          
          // Update messages in current chat to show seen status
          // senderId is the one whose messages were marked as read (the current user)
          // receiverId is the one who viewed the chat
          if (selectedChat && selectedChat.id === receiverId) {
            setMessages(prev => prev.map(msg => {
              const msgSenderId = msg.sender?._id || msg.sender?.id;
              if (msgSenderId === senderId) {
                return { ...msg, isRead: true };
              }
              return msg;
            }));
          }
          
          // Refresh chat rooms to update unread counts
          fetchChatRooms();
        }
      }

      // Message events
      socket.on('new-message', handleNewMessageSocket)
      socket.on('message-sent', handleMessageSentSocket)
      socket.on('message-error', handleMessageError)
      socket.on('user-viewing-status', handleUserViewingStatus)
      socket.on('messages-marked-read', handleMessagesMarkedRead)
      
      // Online/offline events
      socket.on('user-online', (data) => {
        console.log('🟢 User came online:', data.user.name);
        // Update online status in chat rooms
        fetchChatRooms();
      });
      
      socket.on('user-offline', (data) => {
        console.log('🔴 User went offline:', data.user.name);
        // Update online status in chat rooms
        fetchChatRooms();
      });
      
      // Typing events
      socket.on('user-typing', (data) => {
        console.log('⌨️ User typing:', data.sender.name, 'isTyping:', data.isTyping);
        // Handle typing indicators if needed
      });
      
      console.log('🔌 All socket event listeners attached for user:', currentUser.name);

      // Call event handlers
      const handleIncomingCall = (data) => {
        console.log('📞 Incoming call:', data)
        setIncomingCall({
          callId: data.callId,
          caller: data.caller,
          callType: data.callType,
          otherUser: data.caller,
          roomName: data.roomName,
          isIncoming: true,
        })
      }

      const handleCallInitiated = (data) => {
        console.log('📞 Call initiated:', data)
        setActiveCall({
          callId: data.callId,
          callType: data.callType,
          status: data.status,
          receiver: data.receiver,
          receiverId: data.receiver._id,
          otherUser: data.receiver,
          roomName: data.roomName,
          isIncoming: false,
        })
      }

      const handleCallAnswered = (data) => {
        console.log('📞 Call answered:', data)
        if (activeCall && data.callId === activeCall.callId) {
          setActiveCall(prev => ({
            ...prev,
            status: data.status,
            answer: data.answer,
          }))
        }
      }

      const handleCallDeclined = (data) => {
        console.log('📞 Call declined:', data)
        setActiveCall(null)
        setIncomingCall(null)
      }

      const handleCallEnded = (data) => {
        console.log('📞 Call ended:', data)
        setActiveCall(null)
        setIncomingCall(null)
      }

      const handleCallError = (error) => {
        console.error('📞 Call error:', error)
        setActiveCall(null)
        setIncomingCall(null)
        alert('Call error: ' + error.error)
      }

      socket.on('incoming-call', handleIncomingCall)
      socket.on('call-initiated', handleCallInitiated)
      socket.on('call-answered', handleCallAnswered)
      socket.on('call-declined', handleCallDeclined)
      socket.on('call-ended', handleCallEnded)
      socket.on('call-error', handleCallError)

      return () => {
        // Message events
        socket.off('new-message', handleNewMessageSocket)
        socket.off('message-sent', handleMessageSentSocket)
        socket.off('message-error', handleMessageError)
        socket.off('user-viewing-status', handleUserViewingStatus)
        socket.off('messages-marked-read', handleMessagesMarkedRead)
        
        // Online/offline events
        socket.off('user-online')
        socket.off('user-offline')
        
        // Typing events
        socket.off('user-typing')
        
        // Call events
        socket.off('incoming-call', handleIncomingCall)
        socket.off('call-initiated', handleCallInitiated)
        socket.off('call-answered', handleCallAnswered)
        socket.off('call-declined', handleCallDeclined)
        socket.off('call-ended', handleCallEnded)
        socket.off('call-error', handleCallError)
        
        console.log('🔌 Socket event listeners removed for user:', currentUser.name);
      }
    }
  }, [socket, isConnected, selectedChat, currentUser.id])


  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return

    const message = {
      id: Date.now(),
      text: newMessage,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')

    // Update last message in chats
    setChats(prev => prev.map(chat => 
      chat.id === selectedChat.id 
        ? { ...chat, lastMessage: newMessage, time: message.time }
        : chat
    ))
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAvatarUpdate = (updatedUser) => {
    setCurrentUser(updatedUser)
    setShowAvatarUpload(false)
  }

  // Call handlers
  const handleCallInitiated = (callData) => {
    setActiveCall(callData)
  }

  const handleCallEnd = () => {
    setActiveCall(null)
    setIncomingCall(null)
  }

  const handleCallAnswer = () => {
    // Update the incoming call to show it's now connected
    if (incomingCall) {
      setIncomingCall(prev => ({
        ...prev,
        status: 'connected'
      }));
    }
  }

  const handleCallDecline = () => {
    setIncomingCall(null)
  }

  const formatTime = (timeString) => {
    return timeString
  }

  if (showProfile) {
    return (
      <div className="chat-container">
        <Header 
          user={currentUser}
          title="Profile"
          showBackButton={true}
          onBackClick={() => setShowProfile(false)}
          showActions={false}
        />
        
        <div className="profile-content">
          <div className="profile-avatar" style={{ position: 'relative' }}>
            {currentUser.avatar ? (
              <img 
                src={currentUser.avatar}
                alt="Profile"
              />
            ) : (
              <div className="default-avatar-large">
                {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <button
              onClick={() => setShowAvatarUpload(true)}
              style={{
                position: 'absolute',
                bottom: '5px',
                right: '5px',
                background: '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              title="Update Avatar"
            >
              📷
            </button>
          </div>
          
          <div className="profile-info">
            <h2>{currentUser.name || 'User'}</h2>
            <p className="profile-email">{currentUser.email}</p>
            {currentUser.phone && (
              <p className="profile-phone">
                <span className="phone-icon">📱</span>
                {currentUser.phone}
              </p>
            )}
            {currentUser.bio && <p className="bio">{currentUser.bio}</p>}
          </div>
          
          <div className="profile-actions">
            <button className="btn btn-secondary" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showAvatarUpload) {
    return (
      <div className="chat-container">
        <Header 
          user={currentUser}
          title="Update Avatar"
          showBackButton={true}
          onBackClick={() => setShowAvatarUpload(false)}
          showActions={false}
        />
        
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'white' }}>
          <AvatarUpload 
            user={currentUser} 
            onAvatarUpdate={handleAvatarUpdate}
          />
        </div>
      </div>
    )
  }

  // Show active call
  if (activeCall && activeCall.callId) {
    return (
      <JitsiMeet
        user={currentUser}
        callData={activeCall}
        isIncoming={false}
        onCallEnd={handleCallEnd}
        onCallAnswer={handleCallAnswer}
        onCallDecline={handleCallDecline}
      />
    )
  }

  // Show incoming call
  if (incomingCall) {
    return (
      <JitsiMeet
        user={currentUser}
        callData={incomingCall}
        isIncoming={true}
        onCallEnd={handleCallEnd}
        onCallAnswer={handleCallAnswer}
        onCallDecline={handleCallDecline}
      />
    )
  }

  // Show call history
  if (showCallHistory) {
    return (
      <div className="chat-container">
        <Header 
          user={currentUser}
          title="Call History"
          showBackButton={true}
          onBackClick={() => setShowCallHistory(false)}
          showActions={false}
        />
        <CallHistory
          user={currentUser}
          onBack={() => setShowCallHistory(false)}
        />
      </div>
    )
  }

  // Show full-screen tab content for non-chat tabs
  if (activeTab === 'stories' || activeTab === 'groups' || activeTab === 'calls') {
    const getTabTitle = () => {
      if (activeTab === 'stories') return 'Stories';
      if (activeTab === 'groups') return 'Groups';
      if (activeTab === 'calls') return 'Calls';
      return 'Tab';
    };

    return (
      <div className="fullscreen-tab-container">
        <Header 
          user={currentUser}
          title={getTabTitle()}
          showActions={true}
          onProfileClick={() => setShowProfile(true)}
        />
        
        <div className="fullscreen-tab-content">
          {activeTab === 'stories' && (
            <Story 
              user={currentUser} 
              onBack={() => setActiveTab('chats')}
            />
          )}

          {activeTab === 'groups' && (
            <GroupManagement 
              user={currentUser}
              onBack={() => setActiveTab('chats')}
              onGroupSelect={handleGroupSelect}
            />
          )}

          {activeTab === 'calls' && (
            <CallHistory
              user={currentUser}
              onBack={() => setActiveTab('chats')}
            />
          )}
        </div>

        {/* Fixed bottom tabs for navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            <span className="tab-icon">💬</span>
            <span className="tab-label">Chats</span>
            {(() => {
              const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
              return totalUnread > 0 ? (
                <span className="tab-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
              ) : null;
            })()}
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'stories' ? 'active' : ''}`}
            onClick={() => setActiveTab('stories')}
          >
            <span className="tab-icon">📸</span>
            <span className="tab-label">Stories</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            <span className="tab-icon">👥</span>
            <span className="tab-label">Groups</span>
            <span className="tab-badge">0</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveTab('calls')}
          >
            <span className="tab-icon">📞</span>
            <span className="tab-label">Calls</span>
          </button>
        </div>
      </div>
    )
  }

  // Show group details if user clicks on group name
  if (showGroupDetails && selectedGroup) {
    return (
      <div className="chat-container">
        <Header 
          user={currentUser}
          title="Group Info"
          showBackButton={true}
          onBackClick={() => setShowGroupDetails(false)}
          showActions={false}
        />
        
        <div className="group-details-content">
          <div className="group-info">
            <div className="group-header-info">
              <div className="group-avatar">
                {selectedGroup.avatar ? (
                  <img src={selectedGroup.avatar} alt={selectedGroup.name} />
                ) : (
                  <div className="default-avatar-large">
                    {selectedGroup.name?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                )}
              </div>
              <div className="group-name-section">
                <h2>{selectedGroup.name}</h2>
              </div>
            </div>
            
            {selectedGroup.description && (
              <p className="group-description">{selectedGroup.description}</p>
            )}
            
            <p className="group-meta">
              Created by {selectedGroup.createdBy?.name}
            </p>
            
            <p className="group-meta">
              {selectedGroup.members?.length} members
            </p>
          </div>

          <div className="group-members">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Members ({selectedGroup.members?.length || 0})</h3>
              {selectedGroup.createdBy?._id === currentUser.id && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAddMembers(true)}
                  style={{ 
                    padding: '0.5rem', 
                    fontSize: '1.2rem',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Add Members"
                >
                  ➕
                </button>
              )}
            </div>
            <div className="members-list">
              {selectedGroup.members?.map(member => (
                <div key={member._id} className="member-item">
                  <div className="member-avatar">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} />
                    ) : (
                      <div className="default-avatar">
                        {member.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    {isUserOnline(member._id) && (
                      <div className="online-indicator-small"></div>
                    )}
                  </div>
                  <div className="member-info">
                    <h4>
                      {member.name}
                      {selectedGroup.createdBy?._id === member._id && (
                        <span className="creator-badge">Creator</span>
                      )}
                      {selectedGroup.admins?.some(admin => admin._id === member._id) && selectedGroup.createdBy?._id !== member._id && (
                        <span className="admin-badge">Admin</span>
                      )}
                    </h4>
                    <p>{member.phone || member.email}</p>
                    <p className="member-status-text">
                      {isUserOnline(member._id) ? (
                        <span className="online-status">Online</span>
                      ) : (
                        <span className="offline-status">Last seen recently</span>
                      )}
                    </p>
                  </div>
                  {selectedGroup.createdBy?._id === currentUser.id && member._id !== currentUser.id && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => removeMemberFromGroup(member._id)}
                      style={{ 
                        padding: '0.5rem', 
                        fontSize: '1rem',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove member"
                    >
                      ❌
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="group-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowGroupDetails(false)}
            >
              Back to Chat
            </button>
            {selectedGroup.createdBy?._id !== currentUser.id && (
              <button 
                className="btn btn-danger"
                onClick={async () => {
                  if (!window.confirm('Are you sure you want to leave this group?')) {
                    return
                  }
                  
                  try {
                    const response = await fetch(`${API_CONFIG.API_URL}/groups/${selectedGroup._id}/leave`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${currentUser.token}`,
                      },
                    })

                    const data = await response.json()

                    if (data.success) {
                      setSelectedGroup(null)
                      setShowGroupDetails(false)
                      // Don't refresh groups to prevent removal from chats tab
                      // fetchGroups()
                    } else {
                      alert(data.message || 'Failed to leave group')
                    }
                  } catch (err) {
                    alert('Failed to leave group. Please try again.')
                  }
                }}
              >
                Leave Group
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show add members modal
  if (showAddMembers && selectedGroup) {
    return (
      <div className="chat-container">
        <Header 
          user={currentUser}
          title="Add Members"
          showBackButton={true}
          onBackClick={() => {
            setShowAddMembers(false)
            setSelectedUsersToAdd([])
          }}
          showActions={false}
        />
        
        <div className="group-details-content">
          <div className="form-group">
            <label>Select users to add to "{selectedGroup.name}"</label>
            <div className="users-selection">
              {availableUsers.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                  No users available to add
                </p>
              ) : (
                availableUsers.map(userData => (
                  <div 
                    key={userData._id}
                    className={`user-selection-item ${selectedUsersToAdd.includes(userData._id) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedUsersToAdd(prev => 
                        prev.includes(userData._id)
                          ? prev.filter(id => id !== userData._id)
                          : [...prev, userData._id]
                      )
                    }}
                  >
                    <div className="user-avatar">
                      {userData.avatar ? (
                        <img src={userData.avatar} alt={userData.name} />
                      ) : (
                        <div className="default-avatar">
                          {userData.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <h4>{userData.name}</h4>
                      <p>{userData.phone || userData.email}</p>
                    </div>
                    <div className="selection-indicator">
                      {selectedUsersToAdd.includes(userData._id) ? '✓' : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => {
                setShowAddMembers(false)
                setSelectedUsersToAdd([])
              }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={addMembersToGroup}
              disabled={selectedUsersToAdd.length === 0}
            >
              Add {selectedUsersToAdd.length} Member{selectedUsersToAdd.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show group chat if group is selected
  if (selectedGroup && selectedGroup._id) {
    return (
      <div className="chat-room-container">
        <Header 
          user={currentUser}
          title={selectedGroup.name || 'Group'}
          showBackButton={true}
          onBackClick={() => setSelectedGroup(null)}
          showActions={true}
          receiver={{
            name: selectedGroup.name,
            avatar: selectedGroup.avatar,
            id: selectedGroup._id
          }}
          isReceiverOnline={false} // Groups don't have online status
          showCallButtons={false} // No calls for groups
        />
        
        <div className="messages-container">
          <MessageList 
            messages={groupMessages}
            currentUserId={currentUser.id}
            receiver={selectedGroup}
            onMessageReceived={handleNewGroupMessage}
            isUserInChat={true}
            isGroupChat={true}
          />
        </div>
        
         <div className="message-input-container">
          <MessageInput 
            receiverId={selectedGroup._id}
            onMessageSent={handleMessageSent}
            disabled={!isConnected}
            currentUserId={currentUser.id}
            isGroupChat={true}
            userToken={user.token}
          />
         </div>
      </div>
    )
  }

  // Show private chat if chat is selected
  if (selectedChat && selectedChat.id) {
    const chat = chats.find(c => c.id === selectedChat.id) || selectedChat
    
    console.log('🔍 Chat component - chat data for header:', {
      chat,
      chatAvatar: chat?.avatar,
      chatName: chat?.name,
      chatId: chat?.id,
      isOnline: isUserOnline(chat?.id)
    });
    
    return (
      <div className="chat-room-container">
        <Header 
          user={currentUser}
          title={chat && chat.name ? chat.name : 'User'}
          showBackButton={true}
          onBackClick={() => setSelectedChat(null)}
          showActions={true}
          receiver={chat}
          isReceiverOnline={isUserOnline(chat.id)}
          showCallButtons={true}
          onVoiceCall={() => {
            if (!socket || !isConnected) {
              alert('Not connected to server');
              return;
            }
            
            console.log('📞 Initiating voice call to:', chat.name);
            // Emit call initiation through socket (same as CallButton)
            socket.emit('call-initiate', {
              receiverId: chat.id,
              callType: 'voice',
            });
          }}
          onVideoCall={() => {
            if (!socket || !isConnected) {
              alert('Not connected to server');
              return;
            }
            
            console.log('📹 Initiating video call to:', chat.name);
            // Emit call initiation through socket (same as CallButton)
            socket.emit('call-initiate', {
              receiverId: chat.id,
              callType: 'video',
            });
          }}
        />
        
        <div className="messages-container">
          <MessageList 
            messages={messages}
            currentUserId={currentUser.id}
            receiver={chat}
            onMessageReceived={handleNewMessage}
            isUserInChat={true}
          />
        </div>
        
         <div className="message-input-container">
          <MessageInput 
            receiverId={chat.id}
            onMessageSent={handleMessageSent}
            disabled={!isConnected}
            currentUserId={currentUser.id}
            userToken={user.token}
          />
         </div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      {/* Fixed Header */}
      <Header 
        user={currentUser}
        isConnected={isConnected}
        totalUnreadCount={chats.reduce((sum, chat) => sum + (chat.unread || 0), 0)}
        onProfileClick={() => setShowProfile(true)}
        title="Chats"
      />

      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '100px', /* Adjusted for fixed header */
          right: '20px',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          {notifications.map(notification => (
            <div
              key={notification.id}
              style={{
                backgroundColor: '#25D366',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '8px',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}
      
      <div className="chats-list">
        {chats.map(chat => (
          <div 
            key={chat.id} 
            className="chat-item"
            onClick={() => {
              if (chat.type === 'group') {
                // Handle group chat selection
                setSelectedGroup(chat.groupData)
                setSelectedChat(null)
              } else {
                // Handle private chat selection
                setSelectedChat(chat)
                setSelectedGroup(null)
              }
            }}
          >
            <div className="chat-avatar">
              {chat && chat.avatar ? (
                <img src={chat.avatar} alt={chat.name || 'User'} />
              ) : (
                <div className="default-avatar">
                  {chat && chat.name ? chat.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              {chat && chat.online && <div className="online-indicator"></div>}
              {chat.type === 'group' && (
                <div className="group-indicator" title="Group Chat">👥</div>
              )}
            </div>
            
            <div className="chat-content">
              <div className="chat-info">
                <h4>
                  {chat && chat.name ? chat.name : 'User'}
                  {chat.type === 'group' && <span className="group-badge">Group</span>}
                </h4>
                <span className="chat-time">
                  {chat && chat.time ? 
                    new Date(chat.time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    }) : 
                    ''
                  }
                </span>
              </div>
              <div className="chat-preview">
                <p>{chat && chat.lastMessage ? chat.lastMessage : 'No messages yet'}</p>
                {chat && chat.unread > 0 && (
                  <span 
                    className="unread-badge" 
                    title={`${chat.unread} unread message${chat.unread > 1 ? 's' : ''}`}
                  >
                    {chat.unread > 99 ? '99+' : chat.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation - Moved Below Chat List */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          <span className="tab-icon">💬</span>
          <span className="tab-label">Chat</span>
          {(() => {
            const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
            return totalUnread > 0 ? (
              <span className="tab-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
            ) : null;
          })()}
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'stories' ? 'active' : ''}`}
          onClick={() => setActiveTab('stories')}
        >
          <span className="tab-icon">📸</span>
          <span className="tab-label">Stories</span>
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <span className="tab-icon">👥</span>
          <span className="tab-label">Groups</span>
          {(() => {
            const groupUnreadCount = groups.reduce((sum, group) => sum + (group.unreadCount || 0), 0);
            return groupUnreadCount > 0 ? (
              <span className="tab-badge">{groupUnreadCount > 99 ? '99+' : groupUnreadCount}</span>
            ) : null;
          })()}
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'calls' ? 'active' : ''}`}
          onClick={() => setActiveTab('calls')}
        >
          <span className="tab-icon">📞</span>
          <span className="tab-label">Calls</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className={`tab-content ${activeTab !== 'chats' ? 'active' : ''}`}>
        {activeTab === 'stories' && (
          <Story 
            user={currentUser} 
            onBack={() => setActiveTab('chats')}
          />
        )}

        {activeTab === 'groups' && (
          <GroupManagement 
            user={currentUser}
            onBack={() => setActiveTab('chats')}
            onGroupSelect={handleGroupSelect}
          />
        )}

        {activeTab === 'calls' && (
          <CallHistory
            user={currentUser}
            onBack={() => setActiveTab('chats')}
          />
        )}
      </div>
    </div>
  )
}

export default Chat
