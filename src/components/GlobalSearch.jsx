import React, { useState, useEffect, useRef } from 'react';
import { API_CONFIG } from '../config/mobileConfig';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = ({ user, onChatSelect, onClose, onSearchQueryChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    chats: [],
    messages: [],
    users: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Focus search input when component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    // Only handle explicit close actions - no automatic closing
    // Removed escape key and back button auto-close for better control
  }, [onClose]);

  useEffect(() => {
    // Update parent component with current search query
    if (onSearchQueryChange) {
      onSearchQueryChange(searchQuery);
    }

    if (searchQuery.trim().length > 0) {
      const debounceTimer = setTimeout(() => {
        performSearch(searchQuery.trim());
      }, 300); // 300ms debounce

      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults({ chats: [], messages: [], users: [] });
    }
  }, [searchQuery, onSearchQueryChange]);

  const performSearch = async (query) => {
    if (!query) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.API_URL}/search/global?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
      } else {
        console.error('Search failed:', data.message);
        setSearchResults({ chats: [], messages: [], users: [] });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ chats: [], messages: [], users: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset search state
    setSearchQuery('');
    setSearchResults({ chats: [], messages: [], users: [] });
    setActiveTab('all');
    setLoading(false);
    
    // Update parent component
    if (onSearchQueryChange) {
      onSearchQueryChange('');
    }
    
    // Close the search panel
    onClose();
  };

  const handleChatClick = (chat) => {
    const chatData = {
      id: chat.id || chat._id,
      name: chat.name,
      avatar: chat.avatar || '',
      lastMessage: '',
      time: '',
      unread: 0,
      online: true
    };
    
    if (onChatSelect) {
      onChatSelect(chatData);
    }
    handleClose();
  };

  const handleUserClick = (searchUser) => {
    navigate(`/profile/${searchUser._id || searchUser.id}`);
    handleClose();
  };

  const handleMessageClick = (message) => {
    // Navigate to the chat containing this message
    const sender = message.sender || {};
    const receiver = message.receiver || {};
    const otherUser = sender._id === user.id ? receiver : sender;
    
    const chatData = {
      id: otherUser._id || otherUser.id || 'unknown',
      name: otherUser.name || 'Unknown User',
      avatar: otherUser.avatar || '',
      lastMessage: '',
      time: '',
      unread: 0,
      online: true
    };
    
    if (onChatSelect) {
      onChatSelect(chatData);
    }
    handleClose();
  };

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
      });
    }
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? 
        <span key={index} className="bg-yellow-200 font-semibold">{part}</span> : 
        part
    );
  };

  const getTotalResults = () => {
    return searchResults.chats.length + searchResults.messages.length + searchResults.users.length;
  };

  return (
    <div 
      className="fixed inset-0 bg-white z-50 flex flex-col"
      style={{
        animation: 'searchSlideIn 0.2s ease-out'
      }}
    >
      <style>{`
        @keyframes searchSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Search Header */}
      <div className="bg-whatsapp-green text-white p-4 pt-1 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="text-white text-xl p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            ←
          </button>
          <div className="flex-1 relative">
            <div className="bg-white/10 rounded-full px-4 py-2 flex items-center gap-3">
              <span className="text-white/70">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats, messages, and contacts..."
                className="flex-1 bg-transparent text-white placeholder-white/60 outline-none text-sm"
              />
               {searchQuery && (
                 <button
                   onClick={() => {
                     setSearchQuery('');
                     if (onSearchQueryChange) {
                       onSearchQueryChange('');
                     }
                   }}
                   className="text-white/70 hover:text-white text-lg"
                 >
                   ✕
                 </button>
               )}
            </div>
          </div>
        </div>

        {/* Search Tabs */}
        {searchQuery && (
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'all' 
                  ? 'bg-white text-whatsapp-green' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              All ({getTotalResults()})
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'chats' 
                  ? 'bg-white text-whatsapp-green' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Chats ({searchResults.chats.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'messages' 
                  ? 'bg-white text-whatsapp-green' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Messages ({searchResults.messages.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'users' 
                  ? 'bg-white text-whatsapp-green' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Contacts ({searchResults.users.length})
            </button>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto bg-gray-50 mb-8">
        {!searchQuery ? (
          // Search suggestions when no query
          <div className="p-6 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Search ChatApp</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Search for chats, messages, and contacts.<br/>
              Type in the search box above to get started.
            </p>
          </div>
        ) : loading ? (
          // Loading state
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-green"></div>
            <span className="ml-3 text-gray-600">Searching...</span>
          </div>
        ) : getTotalResults() === 0 ? (
          // No results
          <div className="p-6 text-center">
            <div className="text-4xl mb-4">😕</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No results found</h3>
            <p className="text-gray-600 text-sm">
              Try searching with different keywords or check your spelling.
            </p>
          </div>
        ) : (
          // Search results
          <div className="divide-y divide-gray-200">
            {/* Chats Results */}
            {(activeTab === 'all' || activeTab === 'chats') && searchResults.chats.length > 0 && (
              <div className="bg-white">
                {activeTab === 'all' && (
                  <div className="px-4 py-2 bg-gray-100 border-b">
                    <h4 className="text-sm font-semibold text-gray-700">CHATS</h4>
                  </div>
                )}
                {searchResults.chats.map((chat) => (
                  <div
                    key={chat._id}
                    onClick={() => handleChatClick(chat)}
                    className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="relative mr-3">
                      {chat.avatar ? (
                        <img
                          src={chat.avatar}
                          alt={chat.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-whatsapp-green text-white flex items-center justify-center font-semibold">
                          {chat.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {highlightText(chat.name, searchQuery)}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      💬
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Messages Results */}
            {(activeTab === 'all' || activeTab === 'messages') && searchResults.messages.length > 0 && (
              <div className="bg-white">
                {activeTab === 'all' && (
                  <div className="px-4 py-2 bg-gray-100 border-b">
                    <h4 className="text-sm font-semibold text-gray-700">MESSAGES</h4>
                  </div>
                )}
                {searchResults.messages.map((message) => {
                  // Safely determine the other user with null checks
                  const sender = message.sender || {};
                  const receiver = message.receiver || {};
                  const otherUser = sender._id === user.id ? receiver : sender;
                  
                  // Provide fallback values for missing user data
                  const userName = otherUser.name || 'Unknown User';
                  const userAvatar = otherUser.avatar || '';
                  
                  return (
                    <div
                      key={message._id}
                      onClick={() => handleMessageClick(message)}
                      className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="relative mr-3">
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt={userName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                            {userName.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {userName}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          <span className="text-xs text-gray-500 mr-1">
                            {sender._id === user.id ? 'You:' : ''}
                          </span>
                          {highlightText(message.content || '', searchQuery)}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 flex flex-col items-end">
                        <span>{formatTime(message.timestamp)}</span>
                        <span className="mt-1">💬</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Users Results */}
            {(activeTab === 'all' || activeTab === 'users') && searchResults.users.length > 0 && (
              <div className="bg-white">
                {activeTab === 'all' && (
                  <div className="px-4 py-2 bg-gray-100 border-b">
                    <h4 className="text-sm font-semibold text-gray-700">CONTACTS</h4>
                  </div>
                )}
                {searchResults.users.map((searchUser) => (
                  <div
                    key={searchUser._id}
                    onClick={() => handleUserClick(searchUser)}
                    className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="relative mr-3">
                      {searchUser.avatar ? (
                        <img
                          src={searchUser.avatar}
                          alt={searchUser.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center font-semibold">
                          {searchUser.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {highlightText(searchUser.name, searchQuery)}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        {searchUser.phone || 'No phone number'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      👤
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Tips */}
      {searchQuery && getTotalResults() > 0 && (
        <div className="bg-gray-100 px-4 py-2 border-t">
          <p className="text-xs text-gray-600 text-center">
            Found {getTotalResults()} result{getTotalResults() !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        </div>
      )}

    </div>
  );
};

export default GlobalSearch;
