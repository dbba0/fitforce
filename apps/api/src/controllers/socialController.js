const mongoose = require('mongoose');
const Post = require('../models/Post');

function toClientPost(post, meId) {
  const postId = post._id.toString();
  const authorId = post.user?._id ? post.user._id.toString() : post.user?.toString?.() || '';
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const likedByMe = likes.some((id) => id.toString() === meId);

  return {
    id: postId,
    type: post.type || 'update',
    content: post.content || '',
    workoutData: post.workoutData || null,
    createdAt: post.createdAt?.toISOString?.() || new Date(post.createdAt).toISOString(),
    author: {
      id: authorId,
      displayName: post.user?.fullName || 'Athlete'
    },
    likeCount: likes.length,
    likedByMe
  };
}

async function listFeed(req, res) {
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('user', 'fullName');

  return res.json({ posts: posts.map((post) => toClientPost(post, req.user._id.toString())) });
}

async function createPost(req, res) {
  const body = req.body || {};
  if (!body.content || !String(body.content).trim()) {
    return res.status(400).json({ message: 'content is required' });
  }

  const post = await Post.create({
    user: req.user._id,
    type: ['workout', 'achievement', 'progress', 'update'].includes(body.type) ? body.type : 'update',
    content: String(body.content).trim(),
    workoutData: body.workoutData || null,
    likes: []
  });

  const populated = await Post.findById(post._id).populate('user', 'fullName');
  return res.status(201).json({ post: toClientPost(populated, req.user._id.toString()) });
}

async function toggleLike(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const meId = req.user._id.toString();
  const hasLiked = (post.likes || []).some((id) => id.toString() === meId);

  if (hasLiked) {
    post.likes = post.likes.filter((id) => id.toString() !== meId);
  } else {
    post.likes.push(new mongoose.Types.ObjectId(meId));
  }

  await post.save();
  const populated = await Post.findById(post._id).populate('user', 'fullName');
  return res.json({ post: toClientPost(populated, meId) });
}

async function deletePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  if (post.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await Post.deleteOne({ _id: post._id });
  return res.json({ success: true });
}

module.exports = { listFeed, createPost, toggleLike, deletePost };

