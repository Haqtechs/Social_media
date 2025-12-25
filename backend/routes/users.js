const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, email, full_name, bio, profile_picture, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, full_name, bio, profile_picture, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's post count
    const postCount = await pool.query(
      'SELECT COUNT(*) FROM posts WHERE user_id = $1',
      [req.params.id]
    );

    // Get followers count
    const followersCount = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [req.params.id]
    );

    // Get following count
    const followingCount = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [req.params.id]
    );

    res.json({
      ...user.rows[0],
      posts_count: parseInt(postCount.rows[0].count),
      followers_count: parseInt(followersCount.rows[0].count),
      following_count: parseInt(followingCount.rows[0].count)
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/users/me
// @desc    Update user profile
// @access  Private
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { full_name, bio } = req.body;

    const updatedUser = await pool.query(
      'UPDATE users SET full_name = $1, bio = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, username, email, full_name, bio, profile_picture',
      [full_name, bio, req.user.userId]
    );

    res.json(updatedUser.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/users/profile-picture
// @desc    Update profile picture
// @access  Private
router.put('/profile-picture', authMiddleware, upload.single('profile_picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'social-media/profiles',
      transformation: [{ width: 400, height: 400, crop: 'fill' }]
    });

    // Delete local file
    fs.unlinkSync(req.file.path);

    // Update database
    const updatedUser = await pool.query(
      'UPDATE users SET profile_picture = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, profile_picture',
      [result.secure_url, req.user.userId]
    );

    res.json(updatedUser.rows[0]);
  } catch (error) {
    console.error('Upload profile picture error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Follow a user
// @access  Private
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.user.userId;

    if (followingId === followerId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if user exists
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [followingId]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const alreadyFollowing = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    if (alreadyFollowing.rows.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow
    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, followingId]
    );

    res.json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/users/:id/unfollow
// @desc    Unfollow a user
// @access  Private
router.delete('/:id/unfollow', authMiddleware, async (req, res) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING *',
      [followerId, followingId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'You are not following this user' });
    }

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/:id/followers
// @desc    Get user's followers
// @access  Public
router.get('/:id/followers', async (req, res) => {
  try {
    const followers = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture 
       FROM users u 
       INNER JOIN follows f ON u.id = f.follower_id 
       WHERE f.following_id = $1 
       ORDER BY f.created_at DESC`,
      [req.params.id]
    );

    res.json(followers.rows);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/:id/following
// @desc    Get users that this user is following
// @access  Public
router.get('/:id/following', async (req, res) => {
  try {
    const following = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture 
       FROM users u 
       INNER JOIN follows f ON u.id = f.following_id 
       WHERE f.follower_id = $1 
       ORDER BY f.created_at DESC`,
      [req.params.id]
    );

    res.json(following.rows);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/:id/posts
// @desc    Get user's posts
// @access  Public
router.get('/:id/posts', async (req, res) => {
  try {
    const posts = await pool.query(
      `SELECT p.*, u.username, u.full_name, u.profile_picture,
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
       FROM posts p
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.params.id]
    );

    res.json(posts.rows);
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
