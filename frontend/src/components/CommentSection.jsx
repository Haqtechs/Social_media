import { useState, useEffect } from 'react'
import { getComments, createComment, deleteComment } from '../services/API.js'
import { useAuth } from '../context/AuthContext'

const CommentSection = ({ postId, onCommentAdded, onCommentDeleted }) => {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    try {
      const response = await getComments(postId)
      setComments(response.data)
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setLoading(true)
    try {
      const response = await createComment(postId, newComment)
      setComments([...comments, response.data])
      setNewComment('')
      if (onCommentAdded) onCommentAdded()
    } catch (error) {
      console.error('Error creating comment:', error)
      alert('Failed to add comment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (commentId) => {
    if (window.confirm('Delete this comment?')) {
      try {
        await deleteComment(commentId)
        setComments(comments.filter(c => c.id !== commentId))
        if (onCommentDeleted) onCommentDeleted()
      } catch (error) {
        console.error('Error deleting comment:', error)
      }
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-2">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white p-3 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                    {comment.profile_picture ? (
                      <img src={comment.profile_picture} alt={comment.username} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-primary text-sm font-semibold">{comment.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm">{comment.full_name || comment.username}</span>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
                  </div>
                </div>
                {user && user.id === comment.user_id && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CommentSection
