import { useState } from 'react'
import { Link } from 'react-router-dom'
import { likePost, unlikePost, deletePost } from '../services/API.js'
import { useAuth } from '../context/AuthContext'
import CommentSection from './CommentSection'

const PostCard = ({ post, onDelete }) => {
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(parseInt(post.likes_count) || 0)
  const [showComments, setShowComments] = useState(false)
  const [commentsCount, setCommentsCount] = useState(parseInt(post.comments_count) || 0)

  const handleLike = async () => {
    try {
      if (isLiked) {
        await unlikePost(post.id)
        setLikesCount(prev => prev - 1)
        setIsLiked(false)
      } else {
        await likePost(post.id)
        setLikesCount(prev => prev + 1)
        setIsLiked(true)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(post.id)
        if (onDelete) onDelete(post.id)
      } catch (error) {
        console.error('Error deleting post:', error)
      }
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <Link to={`/profile/${post.user_id}`} className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
            {post.profile_picture ? (
              <img src={post.profile_picture} alt={post.username} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-primary font-semibold">{post.username?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{post.full_name || post.username}</p>
            <p className="text-sm text-gray-500">@{post.username} • {formatDate(post.created_at)}</p>
          </div>
        </Link>
        {user && user.id === post.user_id && (
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Delete
          </button>
        )}
      </div>

      {/* Post Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Post Image */}
      {post.image_url && (
        <img src={post.image_url} alt="Post" className="w-full object-cover max-h-96" />
      )}

      {/* Post Actions */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center space-x-6">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 ${isLiked ? 'text-primary' : 'text-gray-500'} hover:text-primary`}
            disabled={!user}
          >
            <svg className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-sm font-medium">{likesCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-gray-500 hover:text-primary"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">{commentsCount}</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentSection 
          postId={post.id} 
          onCommentAdded={() => setCommentsCount(prev => prev + 1)}
          onCommentDeleted={() => setCommentsCount(prev => prev - 1)}
        />
      )}
    </div>
  )
}

export default PostCard
