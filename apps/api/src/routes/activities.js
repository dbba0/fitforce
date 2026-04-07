const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { authRequired } = require('../middleware/auth');
const { jwtSecret } = require('../config/env');
const User = require('../models/User');
const Activity = require('../models/Activity');

const router = express.Router();

async function authOptional(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.sub).select('_id');
    req.user = user || null;
  } catch {
    req.user = null;
  }

  return next();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value, fallback = null) {
  const parsed = value ? new Date(value) : fallback;
  if (!parsed || Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

function normalizeRoute(route) {
  if (!Array.isArray(route)) return [];
  return route
    .map((point) => {
      const lat = toNumber(point?.lat, NaN);
      const lng = toNumber(point?.lng, NaN);
      const timestamp = toDate(point?.timestamp, null);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !timestamp) return null;
      return { lat, lng, timestamp };
    })
    .filter(Boolean);
}

function getFollowedUserIds(user) {
  if (!Array.isArray(user?.following)) return [];
  return user.following
    .map((item) => item?.toString?.() || String(item || ''))
    .map((id) => id.trim())
    .filter(Boolean);
}

function toClientActivity(activity, meId = '') {
  const activityId = activity?._id?.toString?.() || String(activity?._id || '');
  const ownerId = activity?.userId?._id
    ? activity.userId._id.toString()
    : activity?.userId?.toString?.() || '';
  const kudos = Array.isArray(activity?.kudos) ? activity.kudos : [];
  const normalizedKudos = kudos
    .map((item) => {
      const kudoUserId = item?.userId?._id
        ? item.userId._id.toString()
        : item?.userId?.toString?.() || '';
      return {
        userId: kudoUserId,
        createdAt: item?.createdAt?.toISOString?.() || null,
        user:
          item?.userId?._id
            ? {
                id: kudoUserId,
                displayName: item.userId.fullName || 'Athlete',
                avatarUrl: item.userId.avatarUrl || null
              }
            : null
      };
    })
    .filter((item) => !!item.userId);
  const likedByMe = normalizedKudos.some((item) => item.userId === meId);

  return {
    id: activityId,
    userId: ownerId,
    user: activity?.userId?._id
      ? {
          id: ownerId,
          displayName: activity.userId.fullName || 'Athlete',
          avatarUrl: activity.userId.avatarUrl || null
        }
      : null,
    type: activity.type,
    title: activity.title,
    startedAt: activity.startedAt?.toISOString?.() || null,
    finishedAt: activity.finishedAt?.toISOString?.() || null,
    durationSeconds: activity.durationSeconds || 0,
    distanceMeters: activity.distanceMeters || 0,
    calories: activity.calories || 0,
    avgPaceSecPerKm: activity.avgPaceSecPerKm || 0,
    route: Array.isArray(activity.route)
      ? activity.route.map((point) => ({
          lat: point.lat,
          lng: point.lng,
          timestamp: point.timestamp?.toISOString?.() || null
        }))
      : [],
    isPublic: activity.isPublic !== false,
    kudosCount: normalizedKudos.length,
    kudos: normalizedKudos,
    likedByMe,
    commentsCount: activity.commentsCount || 0,
    createdAt: activity.createdAt?.toISOString?.() || null,
    updatedAt: activity.updatedAt?.toISOString?.() || null
  };
}

router.get('/', authRequired, async (req, res) => {
  try {
    const meId = req.user._id.toString();
    const activities = await Activity.find({ userId: req.user._id })
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(50)
      .populate('userId', 'fullName avatarUrl')
      .populate('kudos.userId', 'fullName avatarUrl');

    return res.json({
      activities: activities.map((item) => toClientActivity(item, meId))
    });
  } catch (error) {
    console.error('[Activities] Failed to load own activities', error);
    return res.status(500).json({ message: 'Failed to load activities' });
  }
});

router.post('/', authRequired, async (req, res) => {
  try {
    const body = req.body || {};
    const type = String(body.type || '').trim();
    const title = String(body.title || '').trim();

    if (!type || !['run', 'ride', 'walk', 'workout'].includes(type)) {
      return res.status(400).json({ message: "type must be one of: run, ride, walk, workout" });
    }

    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }

    const startedAt = toDate(body.startedAt, null);
    const finishedAt = toDate(body.finishedAt, null);
    if (!startedAt || !finishedAt) {
      return res.status(400).json({ message: 'startedAt and finishedAt are required dates' });
    }

    const durationSeconds = Math.max(
      0,
      Math.floor(
        toNumber(body.durationSeconds, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000))
      )
    );
    const distanceMeters = Math.max(0, toNumber(body.distanceMeters, 0));
    const calories = Math.max(0, Math.floor(toNumber(body.calories, 0)));
    const computedPace =
      distanceMeters > 0 ? durationSeconds / Math.max(distanceMeters / 1000, 0.001) : 0;
    const avgPaceSecPerKm = Math.max(
      0,
      toNumber(body.avgPaceSecPerKm, computedPace)
    );
    const route = normalizeRoute(body.route);

    const activity = await Activity.create({
      userId: req.user._id,
      type,
      title,
      startedAt,
      finishedAt,
      durationSeconds,
      distanceMeters,
      calories,
      avgPaceSecPerKm,
      route,
      isPublic: body.isPublic !== false,
      kudos: [],
      commentsCount: Math.max(0, Math.floor(toNumber(body.commentsCount, 0)))
    });

    return res.status(201).json({ activity: toClientActivity(activity, req.user._id.toString()) });
  } catch (error) {
    console.error('[Activities] Failed to create activity', error);
    return res.status(500).json({ message: 'Failed to create activity' });
  }
});

router.get('/feed', authRequired, async (req, res) => {
  try {
    const meId = req.user._id.toString();
    const followedIds = getFollowedUserIds(req.user)
      .filter((id) => id !== meId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const conditions = [{ userId: req.user._id }];
    if (followedIds.length > 0) {
      conditions.push({
        userId: { $in: followedIds },
        isPublic: true
      });
    }

    const activities = await Activity.find({ $or: conditions })
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(100)
      .populate('userId', 'fullName avatarUrl')
      .populate('kudos.userId', 'fullName avatarUrl');

    return res.json({
      activities: activities.map((item) => toClientActivity(item, meId))
    });
  } catch (error) {
    console.error('[Activities] Failed to load feed', error);
    return res.status(500).json({ message: 'Failed to load activities feed' });
  }
});

router.get('/:id', authOptional, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('userId', 'fullName avatarUrl')
      .populate('kudos.userId', 'fullName avatarUrl');
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    const meId = req.user?._id?.toString?.() || '';
    const ownerId = activity.userId?._id
      ? activity.userId._id.toString()
      : activity.userId?.toString?.() || '';
    const isOwner = ownerId === meId;

    if (!activity.isPublic && !isOwner) {
      return res.status(403).json({ message: 'This activity is private' });
    }

    return res.json({ activity: toClientActivity(activity, meId) });
  } catch (error) {
    console.error('[Activities] Failed to load activity details', error);
    return res.status(400).json({ message: 'Invalid activity id' });
  }
});

router.post('/:id/kudos', authRequired, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('userId', 'fullName avatarUrl')
      .populate('kudos.userId', 'fullName avatarUrl');
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    const meId = req.user._id.toString();
    const ownerId = activity.userId?._id
      ? activity.userId._id.toString()
      : activity.userId?.toString?.() || '';
    const isOwner = ownerId === meId;

    if (!activity.isPublic && !isOwner) {
      return res.status(403).json({ message: 'This activity is private' });
    }

    const existingIndex = (activity.kudos || []).findIndex(
      (entry) => entry?.userId?.toString?.() === meId
    );

    if (existingIndex >= 0) {
      activity.kudos.splice(existingIndex, 1);
    } else {
      activity.kudos.push({
        userId: req.user._id,
        createdAt: new Date()
      });
    }

    await activity.save();
    return res.json({ activity: toClientActivity(activity, meId) });
  } catch (error) {
    console.error('[Activities] Failed to toggle kudos', error);
    return res.status(400).json({ message: 'Invalid activity id' });
  }
});

module.exports = router;
