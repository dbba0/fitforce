const express = require('express');
const { authRequired } = require('../middleware/auth');
const {
  listFeed,
  createPost,
  toggleLike,
  deletePost
} = require('../controllers/socialController');

const router = express.Router();

router.get('/feed', authRequired, listFeed);
router.post('/posts', authRequired, createPost);
router.post('/posts/:id/like', authRequired, toggleLike);
router.delete('/posts/:id', authRequired, deletePost);

module.exports = router;

