import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { EXERCISE_LIBRARY, ExerciseItem } from '@/constants/exerciseLibrary';

type FilterState = {
  muscle: 'all' | ExerciseItem['muscle'];
  equipment: 'all' | ExerciseItem['equipment'];
  difficulty: 'all' | ExerciseItem['difficulty'];
  mode: 'all' | ExerciseItem['mode'];
};

function FilterRow<T extends string>({
  title,
  value,
  options,
  onChange
}: {
  title: string;
  value: string;
  options: T[];
  onChange: (value: T | 'all') => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable
          onPress={() => onChange('all')}
          style={[styles.chip, value === 'all' && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === 'all' && styles.chipTextActive]}>Tous</Text>
        </Pressable>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.chip, value === opt && styles.chipActive]}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function ExercisesScreen() {
  const [filters, setFilters] = useState<FilterState>({
    muscle: 'all',
    equipment: 'all',
    difficulty: 'all',
    mode: 'all'
  });

  const filtered = useMemo(() => {
    return EXERCISE_LIBRARY.filter((item) => {
      const muscleOk = filters.muscle === 'all' || item.muscle === filters.muscle;
      const equipmentOk = filters.equipment === 'all' || item.equipment === filters.equipment;
      const difficultyOk = filters.difficulty === 'all' || item.difficulty === filters.difficulty;
      const modeOk = filters.mode === 'all' || item.mode === filters.mode;
      return muscleOk && equipmentOk && difficultyOk && modeOk;
    });
  }, [filters]);

  return (
    <Screen style={styles.root}>
      <Text style={styles.title}>Bibliotheque Exercices</Text>

      <View style={styles.filtersBox}>
        <FilterRow
          title="Muscle"
          value={filters.muscle}
          options={['pectoraux', 'dos', 'jambes', 'epaules', 'abdos', 'full body']}
          onChange={(value) => setFilters((prev) => ({ ...prev, muscle: value }))}
        />
        <FilterRow
          title="Materiel"
          value={filters.equipment}
          options={['aucun', 'halteres', 'barre', 'machine']}
          onChange={(value) => setFilters((prev) => ({ ...prev, equipment: value }))}
        />
        <FilterRow
          title="Difficulte"
          value={filters.difficulty}
          options={['debutant', 'intermediaire', 'avance']}
          onChange={(value) => setFilters((prev) => ({ ...prev, difficulty: value }))}
        />
        <FilterRow
          title="Mode"
          value={filters.mode}
          options={['maison', 'salle', 'mixte']}
          onChange={(value) => setFilters((prev) => ({ ...prev, mode: value }))}
        />
      </View>

      <Text style={styles.count}>{filtered.length} exercice(s)</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.badge}>{item.difficulty}</Text>
            </View>
            <Text style={styles.meta}>
              {item.muscle} • {item.equipment} • {item.mode}
            </Text>

            <Text style={styles.sectionLabel}>Erreurs frequentes</Text>
            <Text style={styles.errors}>{item.mistakes.join(' • ')}</Text>

            <Pressable style={styles.videoBtn} onPress={() => Linking.openURL(item.videoUrl)}>
              <Text style={styles.videoBtnText}>Voir video</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#020617' },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '800', marginVertical: 10 },
  filtersBox: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10
  },
  filterTitle: { color: '#94A3B8', marginBottom: 6, fontWeight: '600' },
  chip: {
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  chipActive: { backgroundColor: '#0EA5A4', borderColor: '#0EA5A4' },
  chipText: { color: '#CBD5E1', fontWeight: '600' },
  chipTextActive: { color: '#042F2E' },
  count: { color: '#2DD4BF', fontWeight: '700', marginBottom: 8 },
  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#F8FAFC', fontSize: 17, fontWeight: '800', flexShrink: 1, marginRight: 8 },
  badge: {
    backgroundColor: '#FB923C',
    color: '#3D2209',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  meta: { color: '#94A3B8', marginTop: 6 },
  sectionLabel: { color: '#E2E8F0', marginTop: 10, marginBottom: 4, fontWeight: '700' },
  errors: { color: '#CBD5E1' },
  videoBtn: {
    marginTop: 12,
    backgroundColor: '#0EA5A4',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  videoBtnText: { color: '#032B2B', fontWeight: '800' }
});
