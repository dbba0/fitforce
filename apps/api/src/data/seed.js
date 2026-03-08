require('dotenv').config();
const mongoose = require('mongoose');
const Exercise = require('../models/Exercise');
const Program = require('../models/Program');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fitpulse';

const exercises = [
  {
    name: 'Pompes',
    category: 'push',
    equipment: 'bodyweight',
    mode: 'home',
    description: 'Exercice poids du corps pour pectoraux et triceps',
    videoUrl: 'https://www.youtube.com/watch?v=_l3ySVKYVJ8',
    muscleGroups: ['pectoraux', 'triceps']
  },
  {
    name: 'Squat goblet',
    category: 'legs',
    equipment: 'dumbbells',
    mode: 'home',
    description: 'Travail jambes avec haltère',
    videoUrl: 'https://www.youtube.com/watch?v=6xwGFn-J_QQ',
    muscleGroups: ['quadriceps', 'fessiers']
  },
  {
    name: 'Burpees HIIT',
    category: 'hiit',
    equipment: 'none',
    mode: 'home',
    description: 'Cardio explosif full body',
    videoUrl: 'https://www.youtube.com/watch?v=TU8QYVW0gDU',
    muscleGroups: ['full body']
  },
  {
    name: 'Développé couché barre',
    category: 'push',
    equipment: 'barbell',
    mode: 'gym',
    description: 'Mouvement principal pectoraux',
    videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    muscleGroups: ['pectoraux', 'triceps', 'epaules']
  },
  {
    name: 'Tractions pronation',
    category: 'pull',
    equipment: 'bodyweight',
    mode: 'gym',
    description: 'Dos et biceps',
    videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    muscleGroups: ['dos', 'biceps']
  },
  {
    name: 'Leg Press Machine',
    category: 'legs',
    equipment: 'machine',
    mode: 'gym',
    description: 'Presse cuisses guidée',
    videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
    muscleGroups: ['quadriceps', 'fessiers']
  },
  {
    name: 'Crunch abdos',
    category: 'core',
    equipment: 'none',
    mode: 'both',
    description: 'Renforcement abdominal',
    videoUrl: 'https://www.youtube.com/watch?v=Xyd_fa5zoEU',
    muscleGroups: ['abdominaux']
  },
  {
    name: 'Soulevé de terre roumain',
    category: 'lower',
    equipment: 'barbell',
    mode: 'gym',
    description: 'Ischios et chaîne postérieure',
    videoUrl: 'https://www.youtube.com/watch?v=2SHsk9AzdjA',
    muscleGroups: ['ischios', 'fessiers', 'lombaires']
  },
  {
    name: 'Fentes marchées',
    category: 'legs',
    equipment: 'dumbbells',
    mode: 'both',
    description: 'Travail unilatéral jambes et stabilité',
    videoUrl: 'https://www.youtube.com/watch?v=wrwwXE_x-pQ',
    muscleGroups: ['quadriceps', 'fessiers']
  },
  {
    name: 'Rowing barre',
    category: 'pull',
    equipment: 'barbell',
    mode: 'gym',
    description: 'Épaisseur du dos et gain de force',
    videoUrl: 'https://www.youtube.com/watch?v=vT2GjY_Umpw',
    muscleGroups: ['dos', 'biceps']
  },
  {
    name: 'Développé militaire',
    category: 'upper',
    equipment: 'barbell',
    mode: 'gym',
    description: 'Développement épaules et triceps',
    videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
    muscleGroups: ['epaules', 'triceps']
  },
  {
    name: 'Mountain Climbers',
    category: 'hiit',
    equipment: 'none',
    mode: 'home',
    description: 'Exercice cardio et gainage dynamique',
    videoUrl: 'https://www.youtube.com/watch?v=nmwgirgXLYM',
    muscleGroups: ['abdominaux', 'full body']
  },
  {
    name: 'Hip Thrust barre',
    category: 'lower',
    equipment: 'barbell',
    mode: 'gym',
    description: 'Renforcement fessiers et chaîne postérieure',
    videoUrl: 'https://www.youtube.com/watch?v=LM8XHLYJoYs',
    muscleGroups: ['fessiers', 'ischios']
  },
  {
    name: 'Planche',
    category: 'core',
    equipment: 'none',
    mode: 'both',
    description: 'Gainage statique abdominal et lombaire',
    videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c',
    muscleGroups: ['abdominaux', 'lombaires']
  },
  {
    name: 'Développé incliné haltères',
    category: 'push',
    equipment: 'dumbbells',
    mode: 'gym',
    description: 'Pectoraux haut et stabilité',
    videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8',
    muscleGroups: ['pectoraux', 'triceps', 'epaules']
  },
  {
    name: 'Jump Squat',
    category: 'full_body',
    equipment: 'none',
    mode: 'home',
    description: 'Explosivité des jambes et cardio',
    videoUrl: 'https://www.youtube.com/watch?v=U4s4mEQ5VqU',
    muscleGroups: ['quadriceps', 'fessiers', 'full body']
  },
  {
    name: 'Tirage horizontal machine',
    category: 'pull',
    equipment: 'machine',
    mode: 'gym',
    description: 'Dos milieu et contrôle scapulaire',
    videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033f74',
    muscleGroups: ['dos', 'biceps']
  },
  {
    name: 'Pompes diamant',
    category: 'push',
    equipment: 'bodyweight',
    mode: 'home',
    description: 'Focus triceps et pectoraux internes',
    videoUrl: 'https://www.youtube.com/watch?v=J0DnG1_S92I',
    muscleGroups: ['triceps', 'pectoraux']
  }
];

async function run() {
  await mongoose.connect(MONGO_URI);

  await Exercise.deleteMany({});
  await Program.deleteMany({});

  const created = await Exercise.insertMany(exercises);
  const byName = Object.fromEntries(created.map((e) => [e.name, e]));

  const programs = [
    {
      title: 'Home Full Body 3x',
      description: 'Programme maison sans machine, progression automatique chaque semaine',
      mode: 'home',
      level: 'debutant',
      daysPerWeek: 3,
      tags: ['full_body', 'sans_materiel'],
      sessions: [
        {
          dayLabel: 'Jour 1',
          focus: 'Full Body',
          exercises: [
            { exercise: byName['Pompes']._id, sets: 4, reps: '10-15', restSec: 60 },
            { exercise: byName['Squat goblet']._id, sets: 4, reps: '12', restSec: 75, targetLoadKg: 12 },
            { exercise: byName['Crunch abdos']._id, sets: 3, reps: '20', restSec: 45 }
          ]
        },
        {
          dayLabel: 'Jour 2',
          focus: 'HIIT + Core',
          exercises: [
            { exercise: byName['Burpees HIIT']._id, sets: 6, reps: '30s on / 30s off', restSec: 30 },
            { exercise: byName['Crunch abdos']._id, sets: 4, reps: '25', restSec: 30 }
          ]
        }
      ]
    },
    {
      title: 'Gym Push Pull Legs 5x',
      description: 'Programme salle orienté hypertrophie et force',
      mode: 'gym',
      level: 'intermediaire',
      daysPerWeek: 5,
      tags: ['ppl', 'hypertrophie'],
      sessions: [
        {
          dayLabel: 'Push',
          focus: 'Pectoraux / Epaules / Triceps',
          exercises: [
            { exercise: byName['Développé couché barre']._id, sets: 5, reps: '5-8', restSec: 120, targetLoadKg: 70 },
            { exercise: byName['Leg Press Machine']._id, sets: 3, reps: '12', restSec: 90, targetLoadKg: 140 }
          ]
        },
        {
          dayLabel: 'Pull',
          focus: 'Dos / Biceps',
          exercises: [
            { exercise: byName['Tractions pronation']._id, sets: 4, reps: 'AMRAP', restSec: 90 },
            { exercise: byName['Soulevé de terre roumain']._id, sets: 4, reps: '8-10', restSec: 120, targetLoadKg: 80 }
          ]
        }
      ]
    },
    {
      title: 'Home HIIT & Core 4x',
      description: 'Programme maison intense orienté cardio, abdos et perte de poids',
      mode: 'home',
      level: 'intermediaire',
      daysPerWeek: 4,
      tags: ['hiit', 'abdos', 'perte_de_poids'],
      sessions: [
        {
          dayLabel: 'HIIT 1',
          focus: 'Cardio explosif',
          exercises: [
            { exercise: byName['Burpees HIIT']._id, sets: 8, reps: '20s on / 20s off', restSec: 20 },
            { exercise: byName['Mountain Climbers']._id, sets: 6, reps: '30s', restSec: 20 },
            { exercise: byName['Jump Squat']._id, sets: 5, reps: '15', restSec: 40 }
          ]
        },
        {
          dayLabel: 'Core',
          focus: 'Sangle abdominale',
          exercises: [
            { exercise: byName['Crunch abdos']._id, sets: 4, reps: '25', restSec: 30 },
            { exercise: byName['Planche']._id, sets: 4, reps: '45s', restSec: 30 },
            { exercise: byName['Pompes diamant']._id, sets: 3, reps: '12-15', restSec: 45 }
          ]
        }
      ]
    },
    {
      title: 'Gym Upper Lower 4x',
      description: 'Split upper/lower pour progression force + hypertrophie',
      mode: 'gym',
      level: 'intermediaire',
      daysPerWeek: 4,
      tags: ['upper_lower', 'force'],
      sessions: [
        {
          dayLabel: 'Upper',
          focus: 'Haut du corps',
          exercises: [
            { exercise: byName['Développé incliné haltères']._id, sets: 4, reps: '8-10', restSec: 90, targetLoadKg: 24 },
            { exercise: byName['Rowing barre']._id, sets: 4, reps: '8-10', restSec: 90, targetLoadKg: 60 },
            { exercise: byName['Développé militaire']._id, sets: 4, reps: '6-8', restSec: 120, targetLoadKg: 40 },
            { exercise: byName['Tirage horizontal machine']._id, sets: 3, reps: '10-12', restSec: 75, targetLoadKg: 55 }
          ]
        },
        {
          dayLabel: 'Lower',
          focus: 'Bas du corps',
          exercises: [
            { exercise: byName['Leg Press Machine']._id, sets: 4, reps: '10-12', restSec: 90, targetLoadKg: 160 },
            { exercise: byName['Fentes marchées']._id, sets: 3, reps: '12/12', restSec: 75, targetLoadKg: 14 },
            { exercise: byName['Hip Thrust barre']._id, sets: 4, reps: '8-10', restSec: 120, targetLoadKg: 90 }
          ]
        }
      ]
    },
    {
      title: 'Home Débutant 3 Semaines',
      description: 'Plan progressif maison sans machine pour débutants',
      mode: 'home',
      level: 'debutant',
      daysPerWeek: 3,
      tags: ['debutant', 'progressif', 'sans_materiel'],
      sessions: [
        {
          dayLabel: 'Semaine A',
          focus: 'Technique',
          exercises: [
            { exercise: byName['Pompes']._id, sets: 3, reps: '8-10', restSec: 75 },
            { exercise: byName['Squat goblet']._id, sets: 3, reps: '10', restSec: 75, targetLoadKg: 8 },
            { exercise: byName['Planche']._id, sets: 3, reps: '30s', restSec: 30 }
          ]
        },
        {
          dayLabel: 'Semaine B',
          focus: 'Progression',
          exercises: [
            { exercise: byName['Pompes diamant']._id, sets: 3, reps: '8-12', restSec: 60 },
            { exercise: byName['Fentes marchées']._id, sets: 3, reps: '10/10', restSec: 60, targetLoadKg: 8 },
            { exercise: byName['Crunch abdos']._id, sets: 3, reps: '20', restSec: 30 }
          ]
        }
      ]
    },
    {
      title: 'Gym Full Body Performance 3x',
      description: 'Full body en salle orienté performance et progression charge',
      mode: 'gym',
      level: 'avance',
      daysPerWeek: 3,
      tags: ['full_body', 'performance'],
      sessions: [
        {
          dayLabel: 'Session A',
          focus: 'Force',
          exercises: [
            { exercise: byName['Développé couché barre']._id, sets: 5, reps: '5', restSec: 150, targetLoadKg: 80 },
            { exercise: byName['Soulevé de terre roumain']._id, sets: 4, reps: '6-8', restSec: 120, targetLoadKg: 100 },
            { exercise: byName['Tractions pronation']._id, sets: 4, reps: 'AMRAP', restSec: 90 }
          ]
        },
        {
          dayLabel: 'Session B',
          focus: 'Volume',
          exercises: [
            { exercise: byName['Développé incliné haltères']._id, sets: 4, reps: '10', restSec: 90, targetLoadKg: 26 },
            { exercise: byName['Leg Press Machine']._id, sets: 4, reps: '12', restSec: 90, targetLoadKg: 180 },
            { exercise: byName['Tirage horizontal machine']._id, sets: 4, reps: '12', restSec: 75, targetLoadKg: 65 }
          ]
        }
      ]
    }
  ];

  await Program.insertMany(programs);

  // eslint-disable-next-line no-console
  console.log('Seed complete');
  await mongoose.disconnect();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
