import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../config/mobileConfig';
import Header from './Header';

const UserProfilePage = ({ user: currentUser }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (userId && currentUser?.token) {
      fetchUserProfile();
    }
  }, [userId, currentUser]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch both profile and friendship status
      const [profileResponse, friendStatusResponse] = await Promise.all([
        fetch(`${API_CONFIG.API_URL}/users/profile/${userId}`, {
          headers: { 'Authorization': `Bearer ${currentUser.token}` },
        }),
        fetch(`${API_CONFIG.API_URL}/friends/status/${userId}`, {
          headers: { 'Authorization': `Bearer ${currentUser.token}` },
        })
      ]);

      const profileData = await profileResponse.json();
      const friendStatusData = await friendStatusResponse.json();
      
      if (profileData.success) {
        setUserProfile(profileData.data.user);
        setIsBlocked(profileData.data.isBlocked);
      } else {
        setError(profileData.message || 'Failed to load user profile');
      }

      if (friendStatusData.success) {
        setFriendshipStatus(friendStatusData.data.status);
        setFriendRequestId(friendStatusData.data.requestId);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load user profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    try {
      setIsBlocking(true);
      const response = await fetch(`${API_CONFIG.API_URL}/users/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ userId: userProfile._id }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsBlocked(true);
        setShowBlockConfirm(false);
        // Show success message
        alert(`${userProfile.name} has been blocked successfully`);
      } else {
        console.error('Failed to block user:', data.message);
        alert('Failed to block user. Please try again.');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Error blocking user. Please try again.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockUser = async () => {
    try {
      setIsBlocking(true);
      const response = await fetch(`${API_CONFIG.API_URL}/users/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ userId: userProfile._id }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsBlocked(false);
        alert(`${userProfile.name} has been unblocked successfully`);
      } else {
        console.error('Failed to unblock user:', data.message);
        alert('Failed to unblock user. Please try again.');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Error unblocking user. Please try again.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      setSendingRequest(true);
      const response = await fetch(`${API_CONFIG.API_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ userId: userProfile._id }),
      });

      const data = await response.json();
      
      if (data.success) {
        setFriendshipStatus('sent');
        setFriendRequestId(data.data.friendRequest._id);
        alert(`Friend request sent to ${userProfile.name}!`);
      } else {
        alert(data.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Error sending friend request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    try {
      setSendingRequest(true);
      const response = await fetch(`${API_CONFIG.API_URL}/friends/accept/${friendRequestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setFriendshipStatus('friend');
        setFriendRequestId(null);
        alert(`You are now friends with ${userProfile.name}!`);
      } else {
        alert(data.message || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Error accepting friend request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleStartChat = () => {
    // Only allow chat if users are friends
    if (friendshipStatus !== 'friend') {
      alert('You need to be friends to start a chat. Send a friend request first.');
      return;
    }

    // Create a chat object for the selected user
    const chatData = {
      id: userProfile._id,
      name: userProfile.name || 'User',
      avatar: userProfile.avatar || '',
      phone: userProfile.phone || '',
      lastMessage: '',
      time: '',
      unread: 0,
      online: true
    };
    
    // Store the selected chat in localStorage for the Chat component to use
    localStorage.setItem('selectedChat', JSON.stringify(chatData));
    
    // Navigate to chat page
    navigate('/chat');
  };

  const handleBackClick = () => {
    // Check if we have userProfile loaded and came from chat
    if (userProfile) {
      // Check if there's a current chat in localStorage that matches this user
      const currentChat = localStorage.getItem('selectedChat');
      if (currentChat) {
        try {
          const chatData = JSON.parse(currentChat);
          // If the current chat is for this user, go back to chat
          if (chatData.id === userProfile._id) {
            navigate('/chat');
            return;
          }
        } catch (error) {
          console.error('Error parsing chat data:', error);
        }
      }
      
      // Check URL search params for fromChat parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('fromChat') === 'true') {
        // Create a chat object for this user and go to chat
        const chatData = {
          id: userProfile._id,
          name: userProfile.name || 'User',
          avatar: userProfile.avatar || '',
          phone: userProfile.phone || '',
          lastMessage: '',
          time: '',
          unread: 0,
          online: true
        };
        
        // Store the selected chat in localStorage for the Chat component to use
        localStorage.setItem('selectedChat', JSON.stringify(chatData));
        
        // Navigate to chat page
        navigate('/chat');
        return;
      }
    }
    
    // Default back navigation
    navigate(-1);
  };

  // Generate avatar initials if no avatar
  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Not available';
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          user={currentUser}
          title="User Profile"
          showBackButton={true}
          onBackClick={handleBackClick}
          showActions={false}
        />
        <div className="flex flex-col items-center justify-center h-screen pt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatsapp-green"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          user={currentUser}
          title="User Profile"
          showBackButton={true}
          onBackClick={handleBackClick}
          showActions={false}
        />
        <div className="flex flex-col items-center justify-center h-screen pt-20 px-6">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-gray-600 text-center text-lg mb-6">{error}</p>
          <button
            onClick={handleBackClick}
            className="px-6 py-3 bg-whatsapp-green text-white rounded-lg font-semibold hover:bg-whatsapp-dark transition-colors duration-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          user={currentUser}
          title="User Profile"
          showBackButton={true}
          onBackClick={handleBackClick}
          showActions={false}
        />
        <div className="flex flex-col items-center justify-center h-screen pt-20">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-gray-600 text-lg">User not found</p>
        </div>
      </div>
    );
  }

  // Show limited profile for non-friends
  if (userProfile && friendshipStatus !== 'friend') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header 
          user={currentUser}
          title="User Profile"
          showBackButton={true}
          onBackClick={handleBackClick}
          showActions={false}
        />

        <div className="pt-20 pb-8 px-4 max-w-md mx-auto">
          {/* Limited Profile View */}
          <div className="bg-white rounded-3xl shadow-xl mb-6 overflow-hidden">
            {/* Cover Background */}
            <div className="h-32 bg-gradient-to-r from-gray-400 to-gray-600 relative">
              <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            </div>
            
            {/* Profile Content */}
            <div className="relative px-6 pb-6">
              {/* Avatar */}
              <div className="flex justify-center -mt-16 mb-4">
                {userProfile.avatar ? (
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.name}
                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-500 flex items-center justify-center text-white text-4xl font-bold">
                    {getAvatarInitials(userProfile.name)}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {userProfile.name || 'Unknown User'}
                </h2>
                <p className="text-gray-600 text-sm">
                  Send a friend request to view full profile
                </p>
              </div>

              {/* Friend Request Actions */}
              <div className="space-y-3">
                {friendshipStatus === 'none' && (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={sendingRequest}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {sendingRequest ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <span className="text-lg">👋</span>
                        Send Friend Request
                      </>
                    )}
                  </button>
                )}

                {friendshipStatus === 'sent' && (
                  <button
                    disabled
                    className="w-full bg-yellow-500 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 opacity-75"
                  >
                    <span className="text-lg">📤</span>
                    Friend Request Sent
                  </button>
                )}

                {friendshipStatus === 'received' && (
                  <div className="space-y-2">
                    <p className="text-center text-sm text-gray-600 mb-3">
                      {userProfile.name} sent you a friend request
                    </p>
                    <button
                      onClick={handleAcceptFriendRequest}
                      disabled={sendingRequest}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {sendingRequest ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Accepting...
                        </>
                      ) : (
                        <>
                          <span className="text-lg">✅</span>
                          Accept Friend Request
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="text-sm font-semibold text-blue-800 mb-1">Private Profile</h3>
            <p className="text-xs text-blue-600 leading-relaxed">
              Contact information and full profile details are only visible to friends.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header 
        user={currentUser}
        title="User Profile"
        showBackButton={true}
        onBackClick={handleBackClick}
        showActions={false}
      />

      <div className="pt-20 pb-8 px-4 max-w-md mx-auto">
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl shadow-xl mb-6 overflow-hidden">
          {/* Cover Background */}
          <div className="h-32 bg-gradient-to-r from-whatsapp-green to-whatsapp-dark relative">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          </div>
          
          {/* Profile Content */}
          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="flex justify-center -mt-16 mb-4">
              {userProfile.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-whatsapp-green flex items-center justify-center text-white text-4xl font-bold">
                  {getAvatarInitials(userProfile.name)}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {userProfile.name || 'Unknown User'}
              </h2>
              
              {userProfile.bio && (
                <p className="text-gray-600 italic text-sm px-4 leading-relaxed">
                  "{userProfile.bio}"
                </p>
              )}
            </div>

            {/* Action Buttons - Only for Friends */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleStartChat}
                className="flex-1 bg-whatsapp-green hover:bg-whatsapp-dark text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <span className="text-lg">💬</span>
                Message
              </button>
              
              <button
                onClick={isBlocked ? handleUnblockUser : () => setShowBlockConfirm(true)}
                disabled={isBlocking}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                  isBlocked 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } ${isBlocking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isBlocking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>{isBlocked ? 'Unblocking...' : 'Blocking...'}</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">{isBlocked ? '✅' : '🚫'}</span>
                    {isBlocked ? 'Unblock' : 'Block'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-whatsapp-green">📋</span>
            Contact Information
          </h3>
          
          <div className="space-y-4">
            {/* Phone Number */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-lg">📞</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone Number</p>
                <p className="text-gray-800 font-medium">{formatPhoneNumber(userProfile.phone)}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">✉️</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email Address</p>
                <p className="text-gray-800 font-medium">{userProfile.email || 'Not available'}</p>
              </div>
            </div>

            {/* Join Date */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-lg">📅</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</p>
                <p className="text-gray-800 font-medium">{formatJoinDate(userProfile.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-whatsapp-green">ℹ️</span>
            Additional Information
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">User ID</span>
              <span className="text-gray-800 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {userProfile._id.slice(-8)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Account Status</span>
              <span className="text-green-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Active
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Relationship</span>
              <span className={`font-semibold ${isBlocked ? 'text-red-600' : 'text-blue-600'}`}>
                {isBlocked ? 'Blocked' : 'Contact'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Block Confirmation Modal */}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">🚫</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Block User</h3>
              <p className="text-gray-600 leading-relaxed">
                Are you sure you want to block <span className="font-semibold text-gray-800">{userProfile.name}</span>? 
                You won't receive messages from this user anymore.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-3 px-4 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                disabled={isBlocking}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors duration-200 disabled:opacity-50"
              >
                {isBlocking ? 'Blocking...' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;