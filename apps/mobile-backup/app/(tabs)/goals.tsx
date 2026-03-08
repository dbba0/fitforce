import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ProgressBar } from '@/components/ProgressBar';
import api from '@/api/client';
import { GoalProgress } from '@/types';

export default function GoalsScreen() {
  const [sessionsPerWeek, setSessionsPerWeek] = useState('4');
  const [weeklyCaloriesTarget, setWeeklyCaloriesTarget] = useState('2200');
  const [progress, setProgress] = useState<GoalProgress | null>(null);

  const load = async () => {
    const { data } = await api.get('/goals/progress');
    setProgress(data.progress);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const save = async () => {
    try {
      await api.put('/goals', {
        sessionsPerWeek: Number(sessionsPerWeek),
        weeklyCaloriesTarget: Number(weeklyCaloriesTarget)
      });
      await load();
      Alert.alert('OK', 'Objectifs mis à jour');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
  };

  return (
    <Screen style={styles.root}>
      <Text style={styles.title}>Goals Tracking</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Séances / semaine</Text>
        <TextInput
          value={sessionsPerWeek}
          onChangeText={setSessionsPerWeek}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Calories hebdo cible</Text>
        <TextInput
          value={weeklyCaloriesTarget}
          onChangeText={setWeeklyCaloriesTarget}
          keyboardType="numeric"
          style={styles.input}
        />

        <Pressable onPress={save} style={styles.button}>
          <Text style={styles.buttonText}>Sauvegarder</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <ProgressBar
          label="Séances"
          done={progress?.sessions.done ?? 0}
          target={progress?.sessions.target ?? 0}
          percent={progress?.sessions.percent ?? 0}
        />
        <ProgressBar
          label="Calories brûlées"
          done={progress?.calories.done ?? 0}
          target={progress?.calories.target ?? 0}
          percent={progress?.calories.percent ?? 0}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#020617' },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '800', marginVertical: 12 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    marginBottom: 12
  },
  label: { color: '#CBD5E1', marginBottom: 6 },
  input: {
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    marginBottom: 10
  },
  button: { backgroundColor: '#0EA5A4', borderRadius: 10, paddingVertical: 12, marginTop: 4 },
  buttonText: { color: '#032B2B', textAlign: 'center', fontWeight: '800' }
});
