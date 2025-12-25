const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// @route   GET /api/comments/post/:postId
// @desc    Get all comments for a post
// @access  Public
router.get('/post/:postId', async (req, res) => {
  try {
    const comments = await pool.query(
      `SELECT c.*, 
       u.username, u.full_name, u.profile_picture
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.postId]
    );

    res.json(comments.rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/comments/post/:postId
// @desc    Add a comment to a post
// @access  Private
router.post('/post/:postId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if post exists
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.postId]);

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create comment
    const newComment = await pool.query(
      `INSERT INTO comments (user_id, post_id, content) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [req.user.userId, req.params.postId, content]
    );

    // Get complete comment with user info
    const completeComment = await pool.query(
      `SELECT c.*, 
       u.username, u.full_name, u.profile_picture
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [newComment.rows[0].id]
    );

    res.status(201).json(completeComment.rows[0]);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if comment exists and belongs to user
    const comment = await pool.query(
      'SELECT * FROM comments WHERE id = $1',
      [req.params.id]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    // Update comment
    const updatedComment = await pool.query(
      `UPDATE comments 
       SET content = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [content, req.params.id]
    );

    // Get complete comment with user info
    const completeComment = await pool.query(
      `SELECT c.*, 
       u.username, u.full_name, u.profile_picture
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    res.json(completeComment.rows[0]);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if comment exists and belongs to user
    const comment = await pool.query(
      'SELECT * FROM comments WHERE id = $1',
      [req.params.id]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Delete comment
    await pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
