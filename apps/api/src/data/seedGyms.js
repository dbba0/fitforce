/**
 * seedGyms.js — Seed des salles de sport sénégalaises
 *
 * Usage:
 *   node src/data/seedGyms.js            # upsert idempotent
 *   node src/data/seedGyms.js --reset    # supprime tout puis recrée
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Gym = require('../models/Gym');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fitforce';

// ─── Données ──────────────────────────────────────────────────────────────────
// Coordonnées : [longitude, latitude] — ordre GeoJSON/MongoDB

const GYMS = [
  {
    name: 'RMS Sports',
    type: 'Musculation',
    address: 'Plateau',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Musculation'],
    priceRange: 'moyen',
    verified: true,
    location: { type: 'Point', coordinates: [-17.4380, 14.6695] },
  },
  {
    name: '360 Fitness',
    type: 'Fitness',
    address: 'Avenue Bourguiba',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Cardio', 'Musculation', 'Coach'],
    priceRange: 'moyen',
    verified: true,
    location: { type: 'Point', coordinates: [-17.4430, 14.6712] },
  },
  {
    name: '3B Sports',
    type: 'Multi-sports',
    address: 'Médina',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Parking'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-17.4502, 14.6838] },
  },
  {
    name: 'Club Atlético Dakar',
    type: 'Fitness',
    address: 'Almadies',
    city: 'Dakar',
    hours: 'Lun-Dim 6h-23h',
    amenities: ['Douches', 'Vestiaires', 'Parking', 'Piscine', 'Sauna', 'Coach', 'Cardio', 'Musculation'],
    priceRange: 'premium',
    verified: true,
    location: { type: 'Point', coordinates: [-17.5050, 14.7425] },
  },
  {
    name: 'Bassin Bi Fitness',
    type: 'Natation',
    address: 'Almadies',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-21h',
    amenities: ['Douches', 'Vestiaires', 'Piscine'],
    priceRange: 'moyen',
    verified: false,
    location: { type: 'Point', coordinates: [-17.4980, 14.7380] },
  },
  {
    name: 'Club Iras Fitness',
    type: 'Fitness',
    address: 'Malibu Almadies',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Coach', 'Cardio', 'Musculation'],
    priceRange: 'premium',
    verified: true,
    location: { type: 'Point', coordinates: [-17.5120, 14.7448] },
  },
  {
    name: 'Dakar Fitness Club',
    type: 'Fitness',
    address: 'Ouakam',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Cardio', 'Musculation'],
    priceRange: 'moyen',
    verified: false,
    location: { type: 'Point', coordinates: [-17.4855, 14.7215] },
  },
  {
    name: 'Sacré-Cœur Gym',
    type: 'Musculation',
    address: 'Sacré-Cœur 3',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Musculation'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-17.4735, 14.7162] },
  },
  {
    name: 'Gym Point E',
    type: 'Fitness',
    address: 'Point E',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Coach', 'Cardio', 'Musculation'],
    priceRange: 'moyen',
    verified: true,
    location: { type: 'Point', coordinates: [-17.4612, 14.6988] },
  },
  {
    name: 'Fann Hock Fitness',
    type: 'Fitness',
    address: 'Fann Hock',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Musculation'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-17.4568, 14.6912] },
  },
  {
    name: 'Parcelles Fitness',
    type: 'Fitness',
    address: 'Parcelles Assainies',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Cardio', 'Musculation'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-17.4395, 14.7562] },
  },
  {
    name: 'Grand Dakar Gym',
    type: 'Musculation',
    address: 'Grand Dakar',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Musculation'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-17.4288, 14.7135] },
  },
  {
    name: 'Hann Sports Center',
    type: 'Multi-sports',
    address: 'Hann Bel-Air',
    city: 'Dakar',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Parking', 'Cardio', 'Musculation'],
    priceRange: 'moyen',
    verified: false,
    location: { type: 'Point', coordinates: [-17.4085, 14.7052] },
  },
  {
    name: 'A.S.F.A',
    type: 'Fitness',
    address: 'Camp Militaire',
    city: 'Dakar',
    hours: 'Lun-Ven 7h-20h',
    amenities: ['Douches', 'Vestiaires', 'Parking', 'Cardio', 'Musculation'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-17.4420, 14.7180] },
  },
  {
    name: 'Pikine Gym',
    type: 'Musculation',
    address: 'Pikine',
    city: 'Pikine',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Musculation'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-17.3892, 14.7518] },
  },
  {
    name: 'Guédiawaye Fitness',
    type: 'Fitness',
    address: 'Guédiawaye',
    city: 'Guédiawaye',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Cardio', 'Musculation'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-17.3972, 14.7722] },
  },
  {
    name: 'Rufisque Sport Club',
    type: 'Multi-sports',
    address: 'Rufisque',
    city: 'Rufisque',
    hours: 'Lun-Sam 7h-21h',
    amenities: ['Douches', 'Vestiaires', 'Parking'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-17.2722, 14.7152] },
  },
  {
    name: 'Thiès Fitness Club',
    type: 'Fitness',
    address: 'Thiès',
    city: 'Thiès',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Vestiaires', 'Cardio', 'Musculation'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-16.9359, 14.7910] },
  },
  {
    name: 'Saint-Louis Gym',
    type: 'Musculation',
    address: 'Saint-Louis',
    city: 'Saint-Louis',
    hours: 'Lun-Sam 7h-22h',
    amenities: ['Douches', 'Musculation'],
    priceRange: 'économique',
    verified: false,
    location: { type: 'Point', coordinates: [-16.5094, 16.0335] },
  },
  {
    name: 'Ziguinchor Sports',
    type: 'Multi-sports',
    address: 'Ziguinchor',
    city: 'Ziguinchor',
    hours: 'Lun-Sam 7h-21h',
    amenities: ['Douches', 'Vestiaires', 'Parking'],
    priceRange: 'moyen',
    verified: false,
    location: { type: 'Point', coordinates: [-16.2719, 12.5638] },
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isReset = process.argv.includes('--reset');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  // eslint-disable-next-line no-console
  console.log(`[seedGyms] Connecté à ${MONGO_URI}`);

  // Vérifier / créer l'index 2dsphere
  try {
    const indexes = await Gym.collection.indexes();
    const has2dsphere = indexes.some((idx) =>
      Object.values(idx.key || {}).includes('2dsphere')
    );
    if (!has2dsphere) {
      await Gym.collection.createIndex({ location: '2dsphere' });
      // eslint-disable-next-line no-console
      console.log('[seedGyms] Index 2dsphere créé.');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[seedGyms] Impossible de vérifier l\'index:', err.message);
  }

  if (isReset) {
    const { deletedCount } = await Gym.deleteMany({});
    // eslint-disable-next-line no-console
    console.log(`[seedGyms] --reset : ${deletedCount} salle(s) supprimée(s).`);
  }

  let inserted = 0;
  let updated = 0;

  for (const gym of GYMS) {
    const result = await Gym.findOneAndUpdate(
      { name: gym.name, city: gym.city },
      { $set: gym },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    // lastErrorObject n'est pas disponible avec findOneAndUpdate mongoose — on détermine via createdAt ≈ updatedAt
    const isNew = result.createdAt && result.updatedAt &&
      Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
    if (isNew) inserted++;
    else updated++;
  }

  // eslint-disable-next-line no-console
  console.log(`[seedGyms] Terminé — ${inserted} créée(s), ${updated} mise(s) à jour. Total : ${GYMS.length} salles.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seedGyms] Erreur :', err.message);
  process.exit(1);
});
