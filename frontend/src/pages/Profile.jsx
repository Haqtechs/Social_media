import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getUser, getUserPosts, followUser, unfollowUser, updateProfile, updateProfilePicture } from '../services/API.js'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'

const Profile = () => {
  const { id } = useParams()
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ full_name: '', bio: '' })

  const isOwnProfile = currentUser && currentUser.id === parseInt(id)

  useEffect(() => {
    fetchUserData()
  }, [id])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const [userResponse, postsResponse] = await Promise.all([
        getUser(id),
        getUserPosts(id)
      ])
      setUser(userResponse.data)
      setPosts(postsResponse.data)
      setEditData({
        full_name: userResponse.data.full_name || '',
        bio: userResponse.data.bio || ''
      })
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await unfollowUser(id)
        setUser({ ...user, followers_count: user.followers_count - 1 })
        setIsFollowing(false)
      } else {
        await followUser(id)
        setUser({ ...user, followers_count: user.followers_count + 1 })
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      await updateProfile(editData)
      setUser({ ...user, ...editData })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('profile_picture', file)
      const response = await updateProfilePicture(formData)
      setUser({ ...user, profile_picture: response.data.profile_picture })
    } catch (error) {
      console.error('Error updating profile picture:', error)
      alert('Failed to update profile picture')
    }
  }

  const handleDeletePost = (postId) => {
    setPosts(posts.filter(post => post.id !== postId))
    setUser({ ...user, posts_count: user.posts_count - 1 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          User not found
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start space-x-6">
          {/* Profile Picture */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-primary-light flex items-center justify-center overflow-hidden">
              {user.profile_picture ? (
                <img src={user.profile_picture} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-primary font-bold">{user.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary-dark">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input type="file" accept="image/*" onChange={handleProfilePictureChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <input
                  type="text"
                  value={editData.full_name}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  placeholder="Bio"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex space-x-2">
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                    Save
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{user.full_name || user.username}</h1>
                    <p className="text-gray-500">@{user.username}</p>
                  </div>
                  {isOwnProfile ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary-light"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-2 rounded-lg font-medium ${
                        isFollowing
                          ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          : 'bg-primary text-white hover:bg-primary-dark'
                      }`}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>

                {user.bio && (
                  <p className="text-gray-700 mb-4">{user.bio}</p>
                )}

                <div className="flex space-x-6 text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">{user.posts_count}</span>
                    <span className="text-gray-500 ml-1">Posts</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{user.followers_count}</span>
                    <span className="text-gray-500 ml-1">Followers</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{user.following_count}</span>
                    <span className="text-gray-500 ml-1">Following</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* User Posts */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Posts</h2>
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">No posts yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
          ))
        )}
      </div>
    </div>
  )
}

export default Profile
