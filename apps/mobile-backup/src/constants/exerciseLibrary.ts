export type ExerciseItem = {
  id: string;
  name: string;
  muscle: 'pectoraux' | 'dos' | 'jambes' | 'epaules' | 'abdos' | 'full body';
  equipment: 'aucun' | 'halteres' | 'barre' | 'machine';
  difficulty: 'debutant' | 'intermediaire' | 'avance';
  mode: 'maison' | 'salle' | 'mixte';
  videoUrl: string;
  mistakes: string[];
};

export const EXERCISE_LIBRARY: ExerciseItem[] = [
  {
    id: 'pushups',
    name: 'Pompes controlees',
    muscle: 'pectoraux',
    equipment: 'aucun',
    difficulty: 'debutant',
    mode: 'maison',
    videoUrl: 'https://www.youtube.com/watch?v=_l3ySVKYVJ8',
    mistakes: ['Coudes trop ouverts', 'Hanches qui tombent', 'Amplitude incomplete']
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    muscle: 'jambes',
    equipment: 'halteres',
    difficulty: 'debutant',
    mode: 'maison',
    videoUrl: 'https://www.youtube.com/watch?v=6xwGFn-J_QQ',
    mistakes: ['Dos arrondi', 'Genoux qui rentrent', 'Talons qui decolent']
  },
  {
    id: 'bench-press',
    name: 'Developpe couche',
    muscle: 'pectoraux',
    equipment: 'barre',
    difficulty: 'intermediaire',
    mode: 'salle',
    videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    mistakes: ['Rebond sur la poitrine', 'Poignets casses', 'Pieds instables']
  },
  {
    id: 'lat-pulldown',
    name: 'Tirage poulie haute',
    muscle: 'dos',
    equipment: 'machine',
    difficulty: 'debutant',
    mode: 'salle',
    videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
    mistakes: ['Tirer derriere la nuque', 'Balancer le buste', 'Trop de charge']
  },
  {
    id: 'romanian-deadlift',
    name: 'Souleve de terre roumain',
    muscle: 'jambes',
    equipment: 'barre',
    difficulty: 'intermediaire',
    mode: 'salle',
    videoUrl: 'https://www.youtube.com/watch?v=2SHsk9AzdjA',
    mistakes: ['Dos rond', 'Barre trop loin du corps', 'Genoux bloques']
  },
  {
    id: 'burpees',
    name: 'Burpees',
    muscle: 'full body',
    equipment: 'aucun',
    difficulty: 'avance',
    mode: 'mixte',
    videoUrl: 'https://www.youtube.com/watch?v=TU8QYVW0gDU',
    mistakes: ['Rythme trop eleve au debut', 'Gainage absent', 'Atterrissage dur']
  },
  {
    id: 'shoulder-press',
    name: 'Developpe epaules halteres',
    muscle: 'epaules',
    equipment: 'halteres',
    difficulty: 'intermediaire',
    mode: 'mixte',
    videoUrl: 'https://www.youtube.com/watch?v=qEwKCR5JCog',
    mistakes: ['Hyperextension lombaire', 'Elan excessif', 'Amplitude inconstante']
  },
  {
    id: 'plank',
    name: 'Planche abdominale',
    muscle: 'abdos',
    equipment: 'aucun',
    difficulty: 'debutant',
    mode: 'mixte',
    videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c',
    mistakes: ['Bassin trop bas', 'Tete relevee', 'Respiration bloquee']
  }
];
