const mongoose = require('mongoose');

const activityRoutePointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    timestamp: { type: Date, required: true }
  },
  { _id: false }
);

const activityKudoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['run', 'ride', 'walk', 'workout'],
      required: true,
      default: 'workout'
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    durationSeconds: { type: Number, required: true, min: 0, default: 0 },
    distanceMeters: { type: Number, min: 0, default: 0 },
    calories: { type: Number, min: 0, default: 0 },
    avgPaceSecPerKm: { type: Number, min: 0, default: 0 },
    route: { type: [activityRoutePointSchema], default: [] },
    isPublic: { type: Boolean, default: true },
    kudos: { type: [activityKudoSchema], default: [] },
    commentsCount: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

activitySchema.index({ userId: 1, startedAt: -1 });
activitySchema.index({ isPublic: 1, startedAt: -1 });
activitySchema.index({ 'kudos.userId': 1 });

module.exports = mongoose.model('Activity', activitySchema);
