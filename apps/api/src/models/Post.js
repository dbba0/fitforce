const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['workout', 'achievement', 'progress', 'update'],
      default: 'update'
    },
    content: { type: String, required: true, trim: true, maxlength: 1500 },
    workoutData: { type: mongoose.Schema.Types.Mixed },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);

