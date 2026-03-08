const mongoose = require('mongoose');

const morphologyAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    photos: {
      front: String,
      side: String,
      back: String
    },
    objective: String,
    report: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MorphologyAnalysis', morphologyAnalysisSchema);

