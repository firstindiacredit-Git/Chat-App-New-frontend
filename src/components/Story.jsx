import React, { useState, useEffect, useRef } from 'react';
import { API_CONFIG } from '../config/mobileConfig';
import { useSocket } from '../contexts/SocketContext';

const Story = ({ user, onBack }) => {
  const { socket, isConnected } = useSocket();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [newStoryContent, setNewStoryContent] = useState('');
  const [newStoryMedia, setNewStoryMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('#25D366');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState('medium');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStoryOptions, setShowStoryOptions] = useState(false);
  const [storyType, setStoryType] = useState('text'); // 'text' or 'media'
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [selectedUserStories, setSelectedUserStories] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [myStories, setMyStories] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const [storyViewers, setStoryViewers] = useState([]);
  const [storyLikes, setStoryLikes] = useState({});
  const [storyComments, setStoryComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [currentStoryComments, setCurrentStoryComments] = useState([]);
  const fileInputRef = useRef(null);

  // Fetch stories feed (excluding current user's stories)
  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.API_URL}/stories/feed`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Filter out current user's stories from the feed
        const otherUsersStories = data.data.stories.filter(
          userStories => userStories.author.id !== user.id
        );
        setStories(otherUsersStories);
      } else {
        console.error('Failed to fetch stories:', data.message);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user's stories
  const fetchMyStories = async () => {
    try {
      // const response = await fetch(`${API_CONFIG.API_URL}/stories/user/${user.id}`, {
      const response = await fetch(`${API_CONFIG.API_URL}/stories/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        return data.data.stories;
      }
      return [];
    } catch (error) {
      console.error('Error fetching my stories:', error);
      return [];
    }
  };

  // Create new story
  const createStory = async () => {
    try {
      if (storyType === 'text' && !newStoryContent.trim()) {
        alert('Please add some content to your story');
        return;
      }
      
      if (storyType === 'media' && !uploadedMedia) {
        alert('Please select a photo or video');
        return;
      }

      let storyData;
      
      if (storyType === 'media') {
        // Handle media upload
        const formData = new FormData();
        formData.append('media', uploadedMedia);
        formData.append('content', newStoryContent);
        formData.append('mediaType', uploadedMedia.type.startsWith('image/') ? 'image' : 'video');
        
        // const response = await fetch(`${API_CONFIG.API_URL}/stories/create`, {
        const response = await fetch(`${API_CONFIG.API_URL}/stories/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
          body: formData,
        });
        
        const data = await response.json();
        if (data.success) {
          setNewStoryContent('');
          setUploadedMedia(null);
          setMediaPreview('');
          setShowCreateStory(false);
          fetchStories();
          const myStoriesData = await fetchMyStories();
          setMyStories(myStoriesData);
          alert('Story created successfully!');
        } else {
          alert('Failed to create story: ' + data.message);
        }
        return;
      } else {
        // Handle text story
        storyData = {
          content: newStoryContent,
          media: '',
          mediaType: 'text',
          backgroundColor: selectedBackgroundColor,
          textColor: textColor,
          textSize: textSize
        };
      }

      // const response = await fetch(`${API_CONFIG.API_URL}/stories/create`, {
      const response = await fetch(`${API_CONFIG.API_URL}/stories/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });

      const data = await response.json();
      if (data.success) {
        setNewStoryContent('');
        setNewStoryMedia(null);
        setPreviewUrl('');
        setSelectedBackgroundColor('#25D366');
        setTextColor('#ffffff');
        setTextSize('medium');
        setShowColorPicker(false);
        setShowCreateStory(false);
        fetchStories(); // Refresh stories
        const myStoriesData = await fetchMyStories(); // Refresh my stories
        setMyStories(myStoriesData);
        alert('Story created successfully!');
      } else {
        alert('Failed to create story: ' + data.message);
      }
    } catch (error) {
      console.error('Error creating story:', error);
      alert('Error creating story');
    }
  };

  // View story
  const viewStory = async (storyId) => {
    try {
      // await fetch(`${API_CONFIG.API_URL}/stories/view/${storyId}`, {
      await fetch(`${API_CONFIG.API_URL}/stories/view/${storyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
    } catch (error) {
      console.error('Error viewing story:', error);
    }
  };

  // Delete story
  const deleteStory = async (storyId) => {
    try {
      // const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}`, {
      const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Refresh my stories
        const myStoriesData = await fetchMyStories();
        setMyStories(myStoriesData);
        alert('Story deleted successfully!');
      } else {
        alert('Failed to delete story: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      alert('Error deleting story');
    }
  };

  // Fetch story viewers
  const fetchStoryViewers = async (storyId) => {
    try {
      // const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}/viewers`, {
      const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}/viewers`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStoryViewers(data.data.viewers);
        setShowViewers(true);
      } else {
        console.error('Failed to fetch story viewers:', data.message);
      }
    } catch (error) {
      console.error('Error fetching story viewers:', error);
    }
  };

  // Like/Unlike story
  const toggleLike = async (storyId) => {
    try {
      // const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}/like`, {
      const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStoryLikes(prev => ({
          ...prev,
          [storyId]: {
            count: data.data.likeCount,
            isLiked: data.data.isLiked
          }
        }));
      } else {
        console.error('Failed to toggle like:', data.message);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Add comment to story
  const addComment = async (storyId, commentText) => {
    try {
      // const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}/comment`, {
      const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: commentText }),
      });

      const data = await response.json();
      if (data.success) {
        setNewComment('');
        // Refresh comments for current story
        if (showComments) {
          fetchStoryComments(storyId);
        }
      } else {
        console.error('Failed to add comment:', data.message);
        alert('Failed to add comment: ' + data.message);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment');
    }
  };

  // Fetch story comments
  const fetchStoryComments = async (storyId) => {
    try {
      // const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}/comments`, {
      const response = await fetch(`${API_CONFIG.API_URL}/stories/${storyId}/comments`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCurrentStoryComments(data.data.comments);
      } else {
        console.error('Failed to fetch comments:', data.message);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  // Show/hide comments
  const toggleComments = (storyId) => {
    if (!showComments) {
      fetchStoryComments(storyId);
    }
    setShowComments(!showComments);
  };


  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (storyType === 'media') {
        setUploadedMedia(file);
        const url = URL.createObjectURL(file);
        setMediaPreview(url);
      } else {
        setNewStoryMedia(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  // Open story viewer
  const openStoryViewer = (userStories, index = 0) => {
    setSelectedUserStories(userStories);
    setCurrentStoryIndex(index);
    setShowStoryViewer(true);
    setShowComments(false);
    
    // Mark first story as viewed
    if (userStories.stories[index]) {
      viewStory(userStories.stories[index].id);
    }
  };

  // Navigate stories
  const nextStory = () => {
    // Hide comments when navigating
    setShowComments(false);
    
    if (selectedUserStories && currentStoryIndex < selectedUserStories.stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      viewStory(selectedUserStories.stories[nextIndex].id);
    } else {
      // Move to next user's stories (only if not viewing my own stories)
      if (selectedUserStories.author.id !== user.id) {
        const currentUserIndex = stories.findIndex(s => s.author.id === selectedUserStories.author.id);
        if (currentUserIndex < stories.length - 1) {
          const nextUser = stories[currentUserIndex + 1];
          openStoryViewer(nextUser, 0);
        } else {
          setShowStoryViewer(false);
        }
      } else {
        // If viewing my own stories, just close the viewer
        setShowStoryViewer(false);
      }
    }
  };

  const prevStory = () => {
    // Hide comments when navigating
    setShowComments(false);
    
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      // Move to previous user's stories (only if not viewing my own stories)
      if (selectedUserStories.author.id !== user.id) {
        const currentUserIndex = stories.findIndex(s => s.author.id === selectedUserStories.author.id);
        if (currentUserIndex > 0) {
          const prevUser = stories[currentUserIndex - 1];
          openStoryViewer(prevUser, prevUser.stories.length - 1);
        }
      }
    }
  };

  // Auto-advance story
  useEffect(() => {
    if (showStoryViewer && selectedUserStories) {
      const timer = setTimeout(() => {
        nextStory();
      }, 5000); // 5 seconds per story

      return () => clearTimeout(timer);
    }
  }, [showStoryViewer, currentStoryIndex, selectedUserStories]);

  useEffect(() => {
    const loadStories = async () => {
      await fetchStories();
      const myStoriesData = await fetchMyStories();
      setMyStories(myStoriesData);
    };
    loadStories();
  }, []);

  // Socket event handlers for real-time updates
  useEffect(() => {
    if (socket && isConnected) {
      const handleNewStory = (data) => {
        console.log('📸 New story received:', data);
        // If it's my story, refresh my stories
        if (data.story.author.id === user.id) {
          fetchMyStories().then(setMyStories);
        } else {
          // If it's someone else's story, refresh the feed
          fetchStories();
        }
      };

      const handleStoryDeleted = (data) => {
        console.log('🗑️ Story deleted:', data);
        // If it's my story, refresh my stories
        if (data.author === user.id) {
          fetchMyStories().then(setMyStories);
        } else {
          // If it's someone else's story, refresh the feed
          fetchStories();
        }
      };

      const handleStoryViewed = (data) => {
        console.log('👁️ Story viewed:', data);
        // Update view count in real-time if needed
        setStories(prevStories => {
          return prevStories.map(userStories => {
            if (userStories.author.id === data.authorId) {
              return {
                ...userStories,
                stories: userStories.stories.map(story => {
                  if (story.id === data.storyId) {
                    return {
                      ...story,
                      viewCount: data.viewCount
                    };
                  }
                  return story;
                })
              };
            }
            return userStories;
          });
        });
      };

      const handleStoryLiked = (data) => {
        console.log('❤️ Story liked:', data);
        setStoryLikes(prev => ({
          ...prev,
          [data.storyId]: {
            count: data.likeCount,
            isLiked: data.isLiked
          }
        }));
      };

      const handleStoryCommented = (data) => {
        console.log('💬 Story commented:', data);
        // Refresh comments if currently viewing comments for this story
        if (showComments && selectedUserStories && 
            selectedUserStories.stories[currentStoryIndex]?.id === data.storyId) {
          fetchStoryComments(data.storyId);
        }
      };

      socket.on('new-story', handleNewStory);
      socket.on('story-deleted', handleStoryDeleted);
      socket.on('story-viewed', handleStoryViewed);
      socket.on('story-liked', handleStoryLiked);
      socket.on('story-commented', handleStoryCommented);

      return () => {
        socket.off('new-story', handleNewStory);
        socket.off('story-deleted', handleStoryDeleted);
        socket.off('story-viewed', handleStoryViewed);
        socket.off('story-liked', handleStoryLiked);
        socket.off('story-commented', handleStoryCommented);
      };
    }
  }, [socket, isConnected]);

  // Story Viewers Modal
  if (showViewers) {
    return (
      <div className="story-viewers-modal">
        <div className="story-viewers-overlay" onClick={() => setShowViewers(false)}></div>
        <div className="story-viewers-content">
          <div className="story-viewers-header">
            <h3>Story Viewers</h3>
            <button 
              className="close-viewers-btn"
              onClick={() => setShowViewers(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="viewers-list">
            {storyViewers.length > 0 ? (
              storyViewers.map((viewer) => (
                <div key={viewer.user._id} className="viewer-item">
                  <div className="viewer-avatar">
                    {viewer.user.avatar ? (
                      <img src={viewer.user.avatar} alt={viewer.user.name} />
                    ) : (
                      <div className="default-avatar">
                        {viewer.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="viewer-info">
                    <h4>{viewer.user.name}</h4>
                    <span>{new Date(viewer.viewedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-viewers">
                <p>No one has viewed this story yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showStoryViewer && selectedUserStories) {
    const currentStory = selectedUserStories.stories[currentStoryIndex];
    const isMyStory = selectedUserStories.author.id === user.id;
    
    return (
      <div className="story-viewer">
        <div className="story-viewer-header">
          <div className="story-author-info">
            <div className="story-author-avatar">
              {selectedUserStories.author.avatar ? (
                <img src={selectedUserStories.author.avatar} alt={selectedUserStories.author.name} />
              ) : (
                <div className="default-avatar">
                  {selectedUserStories.author.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h4>{selectedUserStories.author.name}</h4>
              <span>{new Date(currentStory.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="story-viewer-actions">
            {isMyStory && (
              <>
                <button 
                  className="viewers-btn" 
                  onClick={() => fetchStoryViewers(currentStory.id)}
                  title="View Story Viewers"
                >
                  👁️ {currentStory.viewCount || 0}
                </button>
                <button 
                  className="delete-story-btn" 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this story?')) {
                      deleteStory(currentStory.id);
                      setShowStoryViewer(false);
                    }
                  }}
                  title="Delete Story"
                >
                  🗑️
                </button>
              </>
            )}
            <button className="close-story-btn" onClick={() => setShowStoryViewer(false)}>
              ✕
            </button>
          </div>
        </div>

        <div className="story-progress">
          {selectedUserStories.stories.map((_, index) => (
            <div 
              key={index}
              className={`progress-bar ${index <= currentStoryIndex ? 'active' : ''}`}
            />
          ))}
        </div>

        <div className="story-content" onClick={nextStory}>
          {currentStory.mediaType === 'image' && currentStory.media && (
            <img 
              src={`${API_CONFIG.BASE_URL}${currentStory.media}`} 
              alt="Story media" 
              className="story-media"
            />
          )}
          {currentStory.mediaType === 'video' && currentStory.media && (
            <video 
                src={`${API_CONFIG.BASE_URL}${currentStory.media}`} 
              className="story-media"
              controls
              autoPlay
              muted
            />
          )}
          {currentStory.mediaType === 'text' && currentStory.content && (
            <div 
              className="story-text-overlay"
              style={{
                backgroundColor: currentStory.backgroundColor || '#25D366',
                color: currentStory.textColor || '#ffffff',
                fontSize: currentStory.textSize === 'small' ? '1.2rem' : 
                         currentStory.textSize === 'large' ? '2rem' : '1.6rem'
              }}
            >
              <p>{currentStory.content}</p>
            </div>
          )}
          {/* Caption overlay for media stories */}
          {currentStory.mediaType !== 'text' && currentStory.content && (
            <div className="story-caption-overlay">
              <p>{currentStory.content}</p>
            </div>
          )}
        </div>

        {/* Story Interactions - Always visible */}
        {!isMyStory && (
          <div className="story-interactions">
            <div className="story-interaction-buttons">
              <button 
                className={`like-btn ${storyLikes[currentStory.id]?.isLiked ? 'liked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(currentStory.id);
                }}
                title="Like"
              >
                <span className="like-icon">
                  {storyLikes[currentStory.id]?.isLiked ? '❤️' : '🤍'}
                </span>
                <span className="like-count">
                  {storyLikes[currentStory.id]?.count || currentStory.likeCount || 0}
                </span>
              </button>
              
              <button 
                className="comment-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleComments(currentStory.id);
                }}
                title="Comment"
              >
                <span className="comment-icon">💬</span>
                <span className="comment-count">
                  {currentStory.commentCount || 0}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Comments Section */}
        {showComments && (
          <div className="story-comments-section">
            <div className="comments-header">
              <h4>Comments</h4>
              <button 
                className="close-comments-btn"
                onClick={() => setShowComments(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="comments-list">
              {currentStoryComments.length > 0 ? (
                currentStoryComments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-author-avatar">
                      {comment.author.avatar ? (
                        <img src={comment.author.avatar} alt={comment.author.name} />
                      ) : (
                        <div className="default-avatar">
                          {comment.author.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author-name">{comment.author.name}</span>
                        <span className="comment-time">
                          {new Date(comment.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="comment-text">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-comments">
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
            
            <div className="add-comment-section">
              <div className="comment-input-container">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newComment.trim()) {
                      addComment(currentStory.id, newComment.trim());
                    }
                  }}
                  className="comment-input"
                />
                <button 
                  className="send-comment-btn"
                  onClick={() => {
                    if (newComment.trim()) {
                      addComment(currentStory.id, newComment.trim());
                    }
                  }}
                  disabled={!newComment.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="story-navigation">
          <div className="nav-area left" onClick={prevStory}></div>
          <div className="nav-area right" onClick={nextStory}></div>
        </div>
      </div>
    );
  }

  // Story Options Modal
  if (showStoryOptions) {
    return (
      <div className="story-options-modal">
        <div className="story-options-overlay" onClick={() => setShowStoryOptions(false)}></div>
        <div className="story-options-content">
          <div className="story-options-header">
            <h3>Create Story</h3>
            <button 
              className="close-options-btn"
              onClick={() => setShowStoryOptions(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="story-options-buttons">
            <button 
              className="story-option-btn text-option"
              onClick={() => {
                setStoryType('text');
                setShowStoryOptions(false);
                setShowCreateStory(true);
              }}
            >
              <div className="option-icon">📝</div>
              <span>Text Story</span>
            </button>
            
            <button 
              className="story-option-btn media-option"
              onClick={() => {
                setStoryType('media');
                setShowStoryOptions(false);
                setShowCreateStory(true);
              }}
            >
              <div className="option-icon">📷</div>
              <span>Photo/Video</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCreateStory) {
    return (
      <div className="create-story-container">
        <div className="create-story-header">
          <button className="back-btn" onClick={() => setShowCreateStory(false)}>
            ←
          </button>
          <h3>Create Story</h3>
          <button className="post-btn" onClick={createStory}>
            Post
          </button>
        </div>

        <div className="create-story-content">
          <div className="story-author">
            <div className="story-author-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <div className="default-avatar">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <span>{user.name}</span>
          </div>

          {storyType === 'text' ? (
            <>
              {/* Story Preview with Color Background */}
              <div className="story-preview-container">
                <div 
                  className="story-preview-background"
                  style={{ backgroundColor: selectedBackgroundColor }}
                >
                  {newStoryContent && (
                    <div 
                      className="story-preview-text"
                      style={{ 
                        color: textColor,
                        fontSize: textSize === 'small' ? '1.2rem' : textSize === 'large' ? '2rem' : '1.6rem'
                      }}
                    >
                      {newStoryContent}
                    </div>
                  )}
                  {!newStoryContent && (
                    <div className="story-preview-placeholder">
                      Type your story here...
                    </div>
                  )}
                </div>
              </div>

              <textarea
                placeholder="What's on your mind?"
                value={newStoryContent}
                onChange={(e) => setNewStoryContent(e.target.value)}
                className="story-textarea"
              />

              {/* Color Palette */}
              <div className="color-palette-section">
                <h4>Background Colors</h4>
                <div className="color-palette">
                  {[
                    '#25D366', '#128C7E', '#075E54', '#34B7F1', '#0084FF',
                    '#FF6B6B', '#FF8E53', '#FF6B9D', '#C44569', '#F8B500',
                    '#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E', '#E17055',
                    '#2D3436', '#636E72', '#74B9FF', '#00B894', '#FDCB6E'
                  ].map((color) => (
                    <button
                      key={color}
                      className={`color-option ${selectedBackgroundColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedBackgroundColor(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Text Styling Options */}
              <div className="text-styling-section">
                <h4>Text Styling</h4>
                <div className="text-options">
                  <div className="text-color-options">
                    <label>Text Color:</label>
                    <div className="text-color-palette">
                      {['#ffffff', '#000000', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'].map((color) => (
                        <button
                          key={color}
                          className={`text-color-option ${textColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setTextColor(color)}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-size-options">
                    <label>Text Size:</label>
                    <div className="text-size-buttons">
                      <button 
                        className={`size-btn ${textSize === 'small' ? 'active' : ''}`}
                        onClick={() => setTextSize('small')}
                      >
                        Small
                      </button>
                      <button 
                        className={`size-btn ${textSize === 'medium' ? 'active' : ''}`}
                        onClick={() => setTextSize('medium')}
                      >
                        Medium
                      </button>
                      <button 
                        className={`size-btn ${textSize === 'large' ? 'active' : ''}`}
                        onClick={() => setTextSize('large')}
                      >
                        Large
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Media Upload Section */}
              <div className="media-upload-section">
                <div className="media-upload-area">
                  {mediaPreview ? (
                    <div className="media-preview-container">
                      {uploadedMedia?.type.startsWith('image/') ? (
                        <img src={mediaPreview} alt="Media preview" className="media-preview" />
                      ) : (
                        <video src={mediaPreview} controls className="media-preview" />
                      )}
                      <button 
                        className="remove-media-btn"
                        onClick={() => {
                          setUploadedMedia(null);
                          setMediaPreview('');
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="media-upload-placeholder"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="upload-icon">📷</div>
                      <p>Tap to add photo or video</p>
                      <span>Supports JPG, PNG, MP4</span>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Caption for Media */}
              <textarea
                placeholder="Add a caption..."
                value={newStoryContent}
                onChange={(e) => setNewStoryContent(e.target.value)}
                className="story-textarea"
                rows={3}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="stories-container">
      <div className="stories-content">
        {loading ? (
          <div className="loading">Loading stories...</div>
        ) : stories.length === 0 && myStories.length === 0 ? (
          <div className="empty-stories">
            <div className="empty-icon">📸</div>
            <h3>No Stories Yet</h3>
            <p>Share your moments with friends!</p>
            <button 
              className="primary-btn"
              onClick={() => setShowCreateStory(true)}
            >
              Create Your First Story
            </button>
          </div>
        ) : (
          <div className="stories-list">
            {/* My Story - Always show with add story option */}
            <div 
              className="story-item my-story"
              onClick={() => {
                if (myStories.length > 0) {
                  // If I have stories, show them
                  const myStoryData = {
                    author: {
                      id: user.id,
                      name: user.name,
                      avatar: user.avatar
                    },
                    stories: myStories,
                    hasUnviewedStories: false
                  };
                  openStoryViewer(myStoryData);
                } else {
                  // If no stories, create new one
                  setShowCreateStory(true);
                }
              }}
            >
              <div className="story-avatar-container">
                <div className={`story-avatar my-story-avatar ${myStories.length > 0 ? 'has-stories' : 'no-stories'}`}>
                  {myStories.length > 0 ? (
                    // Show story preview when user has stories
                    myStories[0].mediaType === 'text' ? (
                      // Text story preview
                      <div 
                        className="story-preview-avatar"
                        style={{ 
                          backgroundColor: myStories[0].backgroundColor || '#25D366',
                          color: myStories[0].textColor || '#ffffff'
                        }}
                      >
                        {myStories[0].content && (
                          <div 
                            className="story-preview-text-small"
                            style={{ 
                              color: myStories[0].textColor || '#ffffff',
                              fontSize: myStories[0].textSize === 'small' ? '0.8rem' : 
                                       myStories[0].textSize === 'large' ? '1.2rem' : '1rem'
                            }}
                          >
                            {myStories[0].content.length > 20 
                              ? myStories[0].content.substring(0, 20) + '...' 
                              : myStories[0].content
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      // Media story preview (image/video)
                      <div className="story-media-preview-avatar">
                        {myStories[0].mediaType === 'image' ? (
                          <img 
                            src={`${API_CONFIG.BASE_URL}${myStories[0].media}`}
                            alt="Story preview"
                            className="story-media-preview-img"
                          />
                        ) : (
                          <video 
                            src={`${API_CONFIG.BASE_URL}${myStories[0].media}`}
                            className="story-media-preview-video"
                            muted
                          />
                        )}
                        {/* Media type indicator */}
                        <div className="media-type-indicator">
                          {myStories[0].mediaType === 'image' ? '📷' : '🎥'}
                        </div>
                      </div>
                    )
                  ) : (
                    // Show user avatar when no stories
                    user.avatar ? (
                      <img src={user.avatar} alt={user.name} />
                    ) : (
                      <div className="default-avatar">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )
                  )}
                </div>
              </div>
              <div className="story-info">
                <h4>My Story</h4>
                <span>
                  {myStories.length > 0 
                    ? `${myStories.length} story${myStories.length > 1 ? 'ies' : ''}`
                    : 'Add your first story'
                  }
                </span>
              </div>
              {/* Add Story Button - Right side after story info */}
              <button 
                className="add-story-btn-inline"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStoryOptions(true);
                }}
                title="Add Story"
              >
                <span className="plus-icon-inline">+</span>
              </button>
            </div>

            {/* Other users' stories */}
            {stories.map((userStories) => (
              <div 
                key={userStories.author.id}
                className="story-item"
                onClick={() => openStoryViewer(userStories)}
              >
                <div className="story-avatar-container">
                  <div className={`story-avatar ${userStories.hasUnviewedStories ? 'unviewed' : 'viewed'}`}>
                    {userStories.stories[0].mediaType === 'text' ? (
                      // Text story preview
                      <div 
                        className="story-preview-avatar"
                        style={{ 
                          backgroundColor: userStories.stories[0].backgroundColor || '#25D366',
                          color: userStories.stories[0].textColor || '#ffffff'
                        }}
                      >
                        {userStories.stories[0].content && (
                          <div 
                            className="story-preview-text-small"
                            style={{ 
                              color: userStories.stories[0].textColor || '#ffffff',
                              fontSize: userStories.stories[0].textSize === 'small' ? '0.8rem' : 
                                       userStories.stories[0].textSize === 'large' ? '1.2rem' : '1rem'
                            }}
                          >
                            {userStories.stories[0].content.length > 20 
                              ? userStories.stories[0].content.substring(0, 20) + '...' 
                              : userStories.stories[0].content
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      // Media story preview (image/video)
                      <div className="story-media-preview-avatar">
                        {userStories.stories[0].mediaType === 'image' ? (
                          <img 
                            src={`${API_CONFIG.BASE_URL}${userStories.stories[0].media}`}
                            alt="Story preview"
                            className="story-media-preview-img"
                          />
                        ) : (
                          <video 
                            src={`${API_CONFIG.BASE_URL}${userStories.stories[0].media}`}
                            className="story-media-preview-video"
                            muted
                          />
                        )}
                        {/* Media type indicator */}
                        <div className="media-type-indicator">
                          {userStories.stories[0].mediaType === 'image' ? '📷' : '🎥'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="story-info">
                  <h4>{userStories.author.name}</h4>
                  <span>
                    {new Date(userStories.stories[0].createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Story;
