const mongoose = require('mongoose');

const GymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['Musculation', 'Fitness', 'Cardio', 'Calisthenics', 'Crossfit', 'Yoga', 'Arts martiaux', 'Natation', 'Multi-sports'],
      default: 'Fitness',
    },
    address: { type: String, required: true },
    city: { type: String, default: 'Dakar' },
    phone: String,
    hours: { type: String, default: 'Lun-Sam 7h-22h' },
    description: String,
    amenities: [{
      type: String,
      enum: ['Douches', 'Vestiaires', 'Parking', 'Coach', 'Piscine', 'Sauna', 'Cardio', 'Musculation'],
    }],
    priceRange: {
      type: String,
      enum: ['gratuit', 'économique', 'moyen', 'premium'],
      default: 'moyen',
    },
    verified: { type: Boolean, default: false },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
  },
  { timestamps: true }
);

GymSchema.index({ location: '2dsphere' });
GymSchema.index({ type: 1 });
GymSchema.index({ city: 1 });

module.exports = mongoose.model('Gym', GymSchema);
