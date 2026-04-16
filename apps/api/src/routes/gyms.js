const express = require('express');
const router = express.Router();
const Gym = require('../models/Gym');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function distanceLabel(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ─── GET /api/gyms/nearby ─────────────────────────────────────────────────────
// Query params: lat, lng, radius (m, default 5000), limit (default 20), type

router.get('/nearby', async (req, res) => {
  const { lat, lng, radius, limit, type } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: 'Paramètres lat et lng requis.' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const maxDistance = parseInt(radius, 10) || 5000;
  const maxResults = Math.min(parseInt(limit, 10) || 20, 100);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({ message: 'lat et lng doivent être des nombres valides.' });
  }

  try {
    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance,
          spherical: true,
          ...(type ? { query: { type } } : {}),
        },
      },
      { $limit: maxResults },
      {
        $addFields: {
          distanceMeters: { $round: ['$distance', 0] },
          distanceLabel: {
            $cond: {
              if: { $lt: ['$distance', 1000] },
              then: { $concat: [{ $toString: { $round: ['$distance', 0] } }, ' m'] },
              else: {
                $concat: [
                  {
                    $toString: {
                      $divide: [{ $round: [{ $divide: ['$distance', 100] }, 0] }, 10],
                    },
                  },
                  ' km',
                ],
              },
            },
          },
        },
      },
      { $project: { __v: 0, distance: 0 } },
    ];

    const gyms = await Gym.aggregate(pipeline);
    return res.json({ gyms, count: gyms.length });
  } catch (error) {
    // Index 2dsphere manquant
    if (error.code === 2) {
      return res.status(500).json({
        message: 'Index géospatial manquant. Lancez le seed : node src/data/seedGyms.js',
        code: 'MISSING_2DSPHERE_INDEX',
      });
    }
    // eslint-disable-next-line no-console
    console.error('[Gyms] /nearby error:', error.message);
    return res.status(500).json({ message: 'Erreur lors de la recherche de salles à proximité.' });
  }
});

// ─── GET /api/gyms/search ─────────────────────────────────────────────────────
// Query params: q (text), city, limit

router.get('/search', async (req, res) => {
  const { q, city, limit } = req.query;
  const maxResults = Math.min(parseInt(limit, 10) || 20, 100);

  try {
    const filter = {};
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { address: regex },
        { type: regex },
        { description: regex },
      ];
    }
    if (city) filter.city = new RegExp(city, 'i');

    const gyms = await Gym.find(filter)
      .limit(maxResults)
      .select('-__v')
      .lean();

    return res.json({ gyms, count: gyms.length });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Gyms] /search error:', error.message);
    return res.status(500).json({ message: 'Erreur lors de la recherche.' });
  }
});

// ─── GET /api/gyms/:id ────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id).select('-__v').lean();
    if (!gym) return res.status(404).json({ message: 'Salle non trouvée.' });
    return res.json(gym);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'ID invalide.' });
    }
    // eslint-disable-next-line no-console
    console.error('[Gyms] /:id error:', error.message);
    return res.status(500).json({ message: 'Erreur lors de la récupération de la salle.' });
  }
});

// ─── GET /api/gyms ────────────────────────────────────────────────────────────
// Query params: city, type, limit

router.get('/', async (req, res) => {
  const { city, type, limit } = req.query;
  const maxResults = Math.min(parseInt(limit, 10) || 50, 200);

  try {
    const filter = {};
    if (city) filter.city = new RegExp(city, 'i');
    if (type) filter.type = type;

    const gyms = await Gym.find(filter)
      .limit(maxResults)
      .select('-__v')
      .lean();

    return res.json({ gyms, count: gyms.length });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Gyms] / error:', error.message);
    return res.status(500).json({ message: 'Erreur lors de la récupération des salles.' });
  }
});

module.exports = router;
