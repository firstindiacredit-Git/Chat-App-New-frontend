import React, { useState, useEffect, useRef } from 'react'
import { API_CONFIG } from '../config/mobileConfig'
import MobileLayout from './MobileLayout'
import { isMobilePlatform } from '../utils/mobilePermissions'
import { MdOutlineDeleteOutline } from "react-icons/md";
import { AiTwotoneHeart } from "react-icons/ai";

const NewsFeed = ({ user, onBack }) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newPostCaption, setNewPostCaption] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [likingPosts, setLikingPosts] = useState(new Set())
  const [commentingPosts, setCommentingPosts] = useState(new Set())
  const [newComments, setNewComments] = useState({})
  const [expandedComments, setExpandedComments] = useState(new Set())
  const [showPostMenu, setShowPostMenu] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [editCaption, setEditCaption] = useState('')
  const fileInputRef = useRef(null)

  // Fetch news feed posts
  const fetchPosts = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setLoading(true)
        setPosts([])
        setPage(1)
        setHasMore(true)
      }

      const response = await fetch(`${API_CONFIG.API_URL}/posts/feed?page=${pageNum}&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (refresh) {
          setPosts(data.posts)
        } else {
          setPosts(prev => [...prev, ...data.posts])
        }
        setHasMore(data.hasMore)
        setPage(pageNum)
      } else {
        console.error('Failed to fetch posts')
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load more posts
  const loadMorePosts = () => {
    if (!loading && hasMore) {
      fetchPosts(page + 1)
    }
  }

  // Handle image selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Create new post
  const handleCreatePost = async () => {
    if (!selectedImage) {
      alert('Please select an image')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', selectedImage)
      formData.append('caption', newPostCaption)

      const response = await fetch(`${API_CONFIG.API_URL}/posts/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(prev => [data.post, ...prev])
        setShowCreatePost(false)
        setNewPostCaption('')
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    } finally {
      setUploading(false)
    }
  }

  // Like/Unlike post
  const handleLikePost = async (postId) => {
    if (likingPosts.has(postId)) return

    setLikingPosts(prev => new Set(prev).add(postId))
    try {
      const response = await fetch(`${API_CONFIG.API_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Like response:', data) // Debug log
        
        // Fetch the updated post from backend to get accurate data
        try {
          const updatedPostResponse = await fetch(`${API_CONFIG.API_URL}/posts/${postId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (updatedPostResponse.ok) {
            const updatedPost = await updatedPostResponse.json()
            console.log('Updated post data:', updatedPost) // Debug log
            
            setPosts(prev => prev.map(post => 
              post._id === postId ? updatedPost : post
            ))
          }
        } catch (error) {
          console.error('Error fetching updated post:', error)
        }
      }
    } catch (error) {
      console.error('Error liking post:', error)
    } finally {
      setLikingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  // Add comment to post
  const handleAddComment = async (postId, commentText) => {
    if (!commentText.trim() || commentingPosts.has(postId)) return

    setCommentingPosts(prev => new Set(prev).add(postId))
    try {
      const response = await fetch(`${API_CONFIG.API_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: commentText }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Comment created successfully:', data.comment); // Debug log
        console.log('Comment text:', data.comment.text); // Debug comment text
        setPosts(prev => prev.map(post => {
          if (post._id === postId) {
            console.log('Adding comment to post:', post._id, data.comment); // Debug log
            console.log('Comment being added has text:', data.comment.text); // Debug comment text
            return {
              ...post,
              comments: [...post.comments, data.comment]
            }
          }
          return post
        }))
        setNewComments(prev => ({ ...prev, [postId]: '' }))
      } else {
        console.error('Failed to create comment:', response.status); // Debug log
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setCommentingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  // Delete comment
  const handleDeleteComment = async (postId, commentId) => {
    try {
      console.log('Attempting to delete comment:', { postId, commentId });
      
      // Show confirmation dialog
      const confirmed = window.confirm('Are you sure you want to delete this comment?');
      if (!confirmed) {
        console.log('Delete cancelled by user');
        return;
      }

      console.log('Making DELETE request to:', `${API_CONFIG.API_URL}/posts/${postId}/comment/${commentId}`);
      console.log('User token:', user.token);
      console.log('User ID from frontend:', user.id); // Using user.id instead of user._id
      console.log('Full user object:', user);
      console.log('User ID alternatives:', user.id || user.userId || user._id);
      
      const response = await fetch(`${API_CONFIG.API_URL}/posts/${postId}/comment/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('Delete response status:', response.status);

      if (response.ok) {
        console.log('Comment deleted successfully');
        setPosts(prev => prev.map(post => {
          if (post._id === postId) {
            console.log('Removing comment from post:', postId);
            return {
              ...post,
              comments: post.comments.filter(comment => comment._id !== commentId)
            }
          }
          return post
        }))
        alert('Comment deleted successfully!');
      } else {
        const errorText = await response.text();
        console.error('Failed to delete comment:', response.status, errorText);
        alert(`Failed to delete comment: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(`Error deleting comment: ${error.message}`);
    }
  }

  // Edit post
  const handleEditPost = (post) => {
    setEditingPost(post)
    setEditCaption(post.caption || '')
    setShowPostMenu(null)
  }

  // Update post
  const handleUpdatePost = async () => {
    if (!editingPost || !editCaption.trim()) return

    try {
      console.log('Updating post:', editingPost._id);
      console.log('New caption:', editCaption.trim());
      console.log('User ID:', user.id);
      console.log('User token:', user.token);

      const response = await fetch(`${API_CONFIG.API_URL}/posts/${editingPost._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caption: editCaption.trim() }),
      })

      console.log('Update response status:', response.status);

      if (response.ok) {
        console.log('Post updated successfully');
        setPosts(prev => prev.map(post => 
          post._id === editingPost._id 
            ? { ...post, caption: editCaption.trim() }
            : post
        ))
        setEditingPost(null)
        setEditCaption('')
      } else {
        const errorData = await response.json();
        console.error('Failed to update post:', errorData);
        alert(`Failed to update post: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating post:', error)
      alert(`Error updating post: ${error.message}`);
    }
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingPost(null)
    setEditCaption('')
  }

  // Delete post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return

    try {
      console.log('Deleting post:', postId);
      console.log('User ID:', user.id);
      console.log('User token:', user.token);

      const response = await fetch(`${API_CONFIG.API_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('Delete response status:', response.status);

      if (response.ok) {
        console.log('Post deleted successfully');
        setPosts(prev => prev.filter(post => post._id !== postId))
        setShowPostMenu(null) // Close menu after deletion
      } else {
        const errorData = await response.json();
        console.error('Failed to delete post:', errorData);
        alert(`Failed to delete post: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert(`Error deleting post: ${error.message}`);
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    return date.toLocaleDateString()
  }

  // Check if user liked a post
  const isPostLiked = (post) => {
    const isLiked = post.likes.some(like => like.user && like.user._id === user.id)
    console.log(`Post ${post._id} liked by user:`, isLiked);
    console.log('User ID:', user.id);
    console.log('Post likes:', post.likes.map(like => like.user?._id));
    return isLiked
  }

  useEffect(() => {
    fetchPosts(1, true)
  }, [])

  // Create Post Modal
  const CreatePostModal = () => (
    <div className="modal-overlay">
      <div className="modal-content create-post-modal">
        <div className="modal-header">
          <h3>Create Post</h3>
          <button 
            className="close-btn"
            onClick={() => {
              setShowCreatePost(false)
              setSelectedImage(null)
              setImagePreview(null)
              setNewPostCaption('')
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="post-form">
            <div className="image-upload-section">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button 
                    className="change-image-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <div 
                  className="upload-placeholder"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="upload-icon">📷</div>
                  <p>Tap to select image</p>
                </div>
              )}
            </div>
            
            <div className="caption-section">
              <textarea
                placeholder="Write a caption..."
                value={newPostCaption}
                onChange={(e) => setNewPostCaption(e.target.value)}
                rows={3}
              />
            </div>
            
            <button 
              className="create-post-btn"
              onClick={handleCreatePost}
              disabled={!selectedImage || uploading}
            >
              {uploading ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Post Component
  const PostComponent = ({ post }) => {
    // Safety check for post data
    if (!post || !post._id) {
      return null
    }
    
    return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-user-info">
          <img 
            src={post.user && post.user.avatar || '/default-avatar.png'} 
            alt={post.user && post.user.name || 'User'}
            className="post-avatar"
          />
          <div className="post-user-details">
            <h4>{post.user && post.user.name}</h4>
            <span className="post-time">{formatTimestamp(post.createdAt)}</span>
          </div>
        </div>
        
        {post.user && post.user._id === user.id && (
          <div className="post-menu">
            <button 
              className="post-menu-btn"
              onClick={() => setShowPostMenu(showPostMenu === post._id ? null : post._id)}
            >
              ⋮
            </button>
            
            {showPostMenu === post._id && (
              <div className="post-menu-dropdown">
                <button 
                  className="post-menu-item edit-post-btn"
                  onClick={() => handleEditPost(post)}
                >
                  ✏️ Edit Post
                </button>
                <button 
                  className="post-menu-item delete-post-btn"
                  onClick={() => handleDeletePost(post._id)}
                >
                  🗑️ Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {editingPost && editingPost._id === post._id ? (
        <div className="post-caption-edit">
          <textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            rows={3}
            placeholder="Edit caption..."
            className="edit-caption-textarea"
          />
          <div className="edit-caption-actions">
            <button 
              className="save-edit-btn"
              onClick={handleUpdatePost}
            >
              Save
            </button>
            <button 
              className="cancel-edit-btn"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        post.caption && (
          <div className="post-caption">
            <p>{post.caption}</p>
          </div>
        )
      )}
      
      <div className="post-image">
        <img src={post.image && post.image.url} alt="Post" />
      </div>
      
      <div className="post-actions">
        <button 
          className={`like-btn ${isPostLiked(post) ? 'liked' : ''} ${likingPosts.has(post._id) ? 'loading' : ''}`}
          onClick={() => handleLikePost(post._id)}
          disabled={likingPosts.has(post._id)}
        >
          {likingPosts.has(post._id) ? (
            <span className="loading-spinner">⏳</span>
          ) : (
            <span>{isPostLiked(post) ? '❤️' : <AiTwotoneHeart />}</span>
          )}
          <span>{post.likes.length}</span>
        </button>
        
        <button className="comment-btn">
          💬 {post.comments.length}
        </button>
      </div>
      
      {/* Show who liked the post */}
      {post.likes.length > 0 && (
        <div className="post-likes-info">
          <span className="likes-text">
            {post.likes.length === 1 ? (
              <span>
                <strong>{post.likes[0].user && post.likes[0].user.name}</strong> liked
              </span>
            ) : post.likes.length === 2 ? (
              <span>
                <strong>{post.likes[0].user && post.likes[0].user.name}</strong> and <strong>{post.likes[1].user && post.likes[1].user.name}</strong> liked post
              </span>
            ) : (
              <span>
                <strong>{post.likes[0].user && post.likes[0].user.name}</strong> and {post.likes.length - 1} others liked post
              </span>
            )}
          </span>
        </div>
      )}
      
      {post.comments.length > 0 && (
        <div className="post-comments">
        {(expandedComments.has(post._id) ? post.comments : post.comments.slice(0, 2)).map(comment => {
          console.log('Rendering comment:', comment); // Debug log
          console.log('Comment text value:', comment.text); // Debug comment text
          console.log('Comment text type:', typeof comment.text); // Debug comment text type
          console.log('Comment user ID:', comment.user?._id); // Debug comment user ID
          console.log('Current user ID:', user?.id); // Debug current user ID (using user.id)
          console.log('User object keys:', Object.keys(user || {})); // Debug user object structure
          console.log('Can delete?', comment.user && comment.user._id === user.id); // Debug delete permission (using user.id)
          return (
          <div key={comment._id} className="comment">
            <div className="comment-content">
              <div className="comment-header">
                <span className="comment-user">{comment.user && comment.user.name}</span>
                <span className="comment-time">{formatTimestamp(comment.timestamp)}</span>
              </div>
              <div className="comment-text">
                {comment.text ? comment.text : 'No comment text available'}
              </div>
              {!comment.text && (
                <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>
                  DEBUG: Comment text is missing - Text: "{comment.text}", Type: {typeof comment.text}
                </div>
              )}
            </div>
            {/* Always show delete button for testing */}
            <button 
              className="delete-comment-btn"
              onClick={() => handleDeleteComment(post._id, comment._id)}
              title="Delete your comment"
              style={{
                display: 'block', 
                visibility: 'visible', 
                opacity: 1,
                position: 'absolute',
                right: '5px',
                top: '5px',
                
                color: 'red',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '18px',
                cursor: 'pointer',
                zIndex: 1000
              }}
            >
             <MdOutlineDeleteOutline />
            </button>
            {/* Debug info */}
            <div style={{
              fontSize: '10px', 
              color: 'red', 
              position: 'absolute', 
              right: '60px', 
              top: '5px',
              background: 'yellow',
              padding: '2px',
              zIndex: 1001
            }}>
              
            </div>
          </div>
          )
        })}
          {post.comments.length > 2 && !expandedComments.has(post._id) && (
            <button 
              className="view-all-comments"
              onClick={() => setExpandedComments(prev => new Set(prev).add(post._id))}
            >
              View all {post.comments.length} comments
            </button>
          )}
          {post.comments.length > 2 && expandedComments.has(post._id) && (
            <button 
              className="view-all-comments"
              onClick={() => setExpandedComments(prev => {
                const newSet = new Set(prev)
                newSet.delete(post._id)
                return newSet
              })}
            >
              Show less
            </button>
          )}
        </div>
      )}
      
      <div className="post-comment-input">
        <input
          type="text"
          placeholder="Add a comment..."
          value={newComments[post._id] || ''}
          onChange={(e) => setNewComments(prev => ({ ...prev, [post._id]: e.target.value }))}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              handleAddComment(post._id, e.target.value)
            }
          }}
        />
        <button 
          className="send-comment-btn"
          onClick={() => {
            const comment = newComments[post._id]
            if (comment && comment.trim()) {
              console.log('Sending comment:', comment); // Debug log
              handleAddComment(post._id, comment)
            }
          }}
          disabled={commentingPosts.has(post._id) || !newComments[post._id]?.trim()}
        >
          {commentingPosts.has(post._id) ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
    )
  }

  const content = (
    <div className="news-feed">
      <div className="feed-header">
        <button 
          className="create-post-header-btn"
          onClick={() => setShowCreatePost(true)}
        >
          📷 Create Post
        </button>
      </div>
      
      <div className="posts-container">
        {loading && posts.length === 0 ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="no-posts">
            <div className="no-posts-icon">📷</div>
            <h3>No posts yet</h3>
            <p>Be the first to share something!</p>
            <button 
              className="create-first-post-btn"
              onClick={() => setShowCreatePost(true)}
            >
              Create your first post
            </button>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostComponent key={post._id} post={post} />
            ))}
            
            {hasMore && (
              <div className="load-more-container">
                <button 
                  className="load-more-btn"
                  onClick={loadMorePosts}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {showCreatePost && <CreatePostModal />}
    </div>
  )

  if (isMobilePlatform()) {
    return (
      <MobileLayout title="News Feed" onBack={onBack}>
        {content}
      </MobileLayout>
    )
  }

  return content
}

export default NewsFeed
