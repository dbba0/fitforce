const User = require('../models/User');
const Activity = require('../models/Activity');

const ACTIVITY_TEMPLATES = [
  {
    type: 'run',
    title: 'Course matinale',
    daysAgo: 1,
    durationSeconds: 1680,
    distanceMeters: 5200,
    calories: 380,
    avgPaceSecPerKm: 323,
  },
  {
    type: 'ride',
    title: 'Vélo weekend',
    daysAgo: 3,
    durationSeconds: 3480,
    distanceMeters: 22000,
    calories: 620,
    avgPaceSecPerKm: 0,
  },
  {
    type: 'walk',
    title: 'Marche midi',
    daysAgo: 2,
    durationSeconds: 1320,
    distanceMeters: 1800,
    calories: 120,
    avgPaceSecPerKm: 733,
  },
  {
    type: 'run',
    title: 'Course soir',
    daysAgo: 4,
    durationSeconds: 2520,
    distanceMeters: 8100,
    calories: 580,
    avgPaceSecPerKm: 311,
  },
  {
    type: 'run',
    title: 'Sortie longue',
    daysAgo: 7,
    durationSeconds: 4680,
    distanceMeters: 15000,
    calories: 1050,
    avgPaceSecPerKm: 312,
  },
];

async function seedActivitiesIfEmpty() {
  try {
    const count = await Activity.countDocuments();
    if (count > 0) {
      // eslint-disable-next-line no-console
      console.log(`[Seed] ${count} activité(s) déjà en base, skip.`);
      return;
    }

    const user = await User.findOne().sort({ createdAt: 1 });
    if (!user) {
      // eslint-disable-next-line no-console
      console.log('[Seed] Aucun utilisateur trouvé — les activités seront seedées à la première connexion.');
      return;
    }

    const now = Date.now();
    const docs = ACTIVITY_TEMPLATES.map(
      ({ type, title, daysAgo, durationSeconds, distanceMeters, calories, avgPaceSecPerKm }) => {
        const finishedAt = new Date(now - daysAgo * 86_400_000);
        const startedAt = new Date(finishedAt.getTime() - durationSeconds * 1000);
        return {
          userId: user._id,
          type,
          title,
          startedAt,
          finishedAt,
          durationSeconds,
          distanceMeters,
          calories,
          avgPaceSecPerKm,
          isPublic: true,
          kudos: [],
          route: [],
        };
      }
    );

    await Activity.insertMany(docs);
    // eslint-disable-next-line no-console
    console.log(`[Seed] ${docs.length} activités créées pour ${user.fullName || user.email}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Seed] seedActivitiesIfEmpty failed:', err.message);
  }
}

module.exports = { seedActivitiesIfEmpty };
