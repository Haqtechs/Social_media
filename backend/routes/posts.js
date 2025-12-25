const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// @route   GET /api/posts/feed
// @desc    Get all posts for feed (chronological)
// @access  Public
router.get('/feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const posts = await pool.query(
      `SELECT p.*, 
       u.username, u.full_name, u.profile_picture,
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
       FROM posts p
       INNER JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(posts.rows);
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await pool.query(
      `SELECT p.*, 
       u.username, u.full_name, u.profile_picture,
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
       FROM posts p
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post.rows[0]);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({ error: 'Post must have content or an image' });
    }

    let imageUrl = null;

    // Upload image to Cloudinary if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'social-media/posts'
      });
      imageUrl = result.secure_url;
      fs.unlinkSync(req.file.path); // Delete local file
    }

    // Insert post
    const newPost = await pool.query(
      `INSERT INTO posts (user_id, content, image_url) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [req.user.userId, content || '', imageUrl]
    );

    // Get complete post with user info
    const completePost = await pool.query(
      `SELECT p.*, 
       u.username, u.full_name, u.profile_picture,
       0 as likes_count,
       0 as comments_count
       FROM posts p
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [newPost.rows[0].id]
    );

    res.status(201).json(completePost.rows[0]);
  } catch (error) {
    console.error('Create post error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    // Check if post exists and belongs to user
    const post = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [req.params.id]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    // Update post
    const updatedPost = await pool.query(
      `UPDATE posts 
       SET content = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [content, req.params.id]
    );

    // Get complete post with user info
    const completePost = await pool.query(
      `SELECT p.*, 
       u.username, u.full_name, u.profile_picture,
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
       FROM posts p
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    res.json(completePost.rows[0]);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if post exists and belongs to user
    const post = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [req.params.id]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Delete post (cascades to likes and comments)
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Like a post
// @access  Private
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    // Check if post exists
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already liked
    const existingLike = await pool.query(
      'SELECT * FROM likes WHERE user_id = $1 AND post_id = $2',
      [req.user.userId, req.params.id]
    );

    if (existingLike.rows.length > 0) {
      return res.status(400).json({ error: 'Post already liked' });
    }

    // Create like
    await pool.query(
      'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
      [req.user.userId, req.params.id]
    );

    // Get updated likes count
    const likesCount = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE post_id = $1',
      [req.params.id]
    );

    res.json({ 
      message: 'Post liked successfully',
      likes_count: parseInt(likesCount.rows[0].count)
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/posts/:id/unlike
// @desc    Unlike a post
// @access  Private
router.delete('/:id/unlike', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING *',
      [req.user.userId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Post not liked yet' });
    }

    // Get updated likes count
    const likesCount = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE post_id = $1',
      [req.params.id]
    );

    res.json({ 
      message: 'Post unliked successfully',
      likes_count: parseInt(likesCount.rows[0].count)
    });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/posts/:id/likes
// @desc    Get users who liked a post
// @access  Public
router.get('/:id/likes', async (req, res) => {
  try {
    const likes = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture, l.created_at
       FROM likes l
       INNER JOIN users u ON l.user_id = u.id
       WHERE l.post_id = $1
       ORDER BY l.created_at DESC`,
      [req.params.id]
    );

    res.json(likes.rows);
  } catch (error) {
    console.error('Get post likes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
