import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import api from '@/api/client';

export default function WorkoutScreen() {
  const [mode, setMode] = useState<'home' | 'gym'>('home');
  const [seconds, setSeconds] = useState(0);
  const [reps, setReps] = useState(0);
  const [loadKg, setLoadKg] = useState('20');
  const [sets, setSets] = useState('4');

  const formatted = useMemo(() => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }, [seconds]);

  const tick = () => setSeconds((v) => v + 1);

  const saveWorkout = async () => {
    try {
      await api.post('/workouts', {
        mode,
        durationMin: Math.max(5, Math.round(seconds / 60)),
        caloriesBurned: mode === 'home' ? Math.round(seconds * 0.16) : Math.round(seconds * 0.12),
        exercises: [],
        notes: `Session ${mode} - ${sets} series - ${reps} reps - ${loadKg}kg`
      });
      Alert.alert('Session enregistrée', 'Progression mise à jour automatiquement.');
    } catch {
      Alert.alert('Erreur', 'Impossible d’enregistrer la session.');
    }
  };

  return (
    <Screen style={styles.root}>
      <Text style={styles.title}>Session Active</Text>

      <View style={styles.segment}>
        <Pressable onPress={() => setMode('home')} style={[styles.segmentBtn, mode === 'home' && styles.active]}>
          <Text style={styles.segmentText}>Maison</Text>
        </Pressable>
        <Pressable onPress={() => setMode('gym')} style={[styles.segmentBtn, mode === 'gym' && styles.active]}>
          <Text style={styles.segmentText}>Salle</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Minuteur</Text>
        <Text style={styles.timer}>{formatted}</Text>
        <Pressable onPress={tick} style={styles.buttonPrimary}>
          <Text style={styles.btnPrimaryText}>+ 1 seconde</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Compteur répétitions</Text>
        <Text style={styles.reps}>{reps}</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setReps((v) => Math.max(0, v - 1))} style={styles.buttonGhost}><Text style={styles.btnGhostText}>-1</Text></Pressable>
          <Pressable onPress={() => setReps((v) => v + 1)} style={styles.buttonGhost}><Text style={styles.btnGhostText}>+1</Text></Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Séries / Charge</Text>
        <TextInput style={styles.input} value={sets} onChangeText={setSets} keyboardType="numeric" placeholder="Séries" placeholderTextColor="#64748B" />
        <TextInput style={styles.input} value={loadKg} onChangeText={setLoadKg} keyboardType="numeric" placeholder="Charge kg" placeholderTextColor="#64748B" />
        <Pressable onPress={saveWorkout} style={styles.buttonPrimary}><Text style={styles.btnPrimaryText}>Enregistrer la séance</Text></Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#020617' },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '800', marginVertical: 12 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14
  },
  segmentBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  active: { backgroundColor: '#0EA5A4' },
  segmentText: { color: '#E2E8F0', fontWeight: '700' },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    marginBottom: 12
  },
  label: { color: '#CBD5E1', marginBottom: 8 },
  timer: { color: '#2DD4BF', fontSize: 42, fontWeight: '800' },
  reps: { color: '#FB923C', fontSize: 36, fontWeight: '800', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    marginBottom: 8
  },
  buttonPrimary: { backgroundColor: '#0EA5A4', borderRadius: 10, paddingVertical: 12 },
  btnPrimaryText: { color: '#032B2B', textAlign: 'center', fontWeight: '800' },
  buttonGhost: { backgroundColor: '#0B1220', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#334155' },
  btnGhostText: { color: '#E2E8F0', fontWeight: '700' }
});
