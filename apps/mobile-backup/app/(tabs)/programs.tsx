import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import api from '@/api/client';
import { Program } from '@/types';

export default function ProgramsScreen() {
  const [mode, setMode] = useState<'home' | 'gym'>('home');
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get('/programs', { params: { mode } });
      setPrograms(data.programs);
    };

    load().catch(() => undefined);
  }, [mode]);

  return (
    <Screen style={styles.root}>
      <Text style={styles.title}>Programmes</Text>
      <View style={styles.segment}>
        <Pressable
          onPress={() => setMode('home')}
          style={[styles.segmentBtn, mode === 'home' && styles.segmentBtnActive]}
        >
          <Text style={styles.segmentText}>Maison</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('gym')}
          style={[styles.segmentBtn, mode === 'gym' && styles.segmentBtnActive]}
        >
          <Text style={styles.segmentText}>Salle</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {programs.map((program) => {
            const sessions = Array.isArray(program.sessions) ? program.sessions : [];
            return (
            <View key={program._id} style={styles.card}>
              <Text style={styles.cardTitle}>{program.title}</Text>
              <Text style={styles.cardSub}>{program.description}</Text>
              <Text style={styles.cardMeta}>
                Niveau: {program.level} | {program.daysPerWeek} jours/sem
              </Text>
              <Text style={styles.cardTags}>{program.tags?.join(' • ')}</Text>

              <Text style={styles.sectionTitle}>Exercices du programme</Text>
              {sessions.length === 0 ? (
                <Text style={styles.emptyText}>Aucune seance detaillee pour ce programme.</Text>
              ) : (
                sessions.slice(0, 3).map((session, idx) => {
                  const lines = Array.isArray(session.exercises) ? session.exercises : [];
                  return (
                <View key={`${program._id}-session-${idx}`} style={styles.sessionBox}>
                  <Text style={styles.sessionTitle}>
                    {session.dayLabel} • {session.focus}
                  </Text>
                  {lines.slice(0, 6).map((line, lineIndex) => (
                    <Text key={`${program._id}-line-${lineIndex}`} style={styles.exerciseLine}>
                      • {line.exercise?.name || 'Exercice'} - {line.sets || 0}x{line.reps || '-'} - repos{' '}
                      {line.restSec || 0}s
                      {line.targetLoadKg ? ` - ${line.targetLoadKg}kg` : ''}
                    </Text>
                  ))}
                </View>
                );
                })
              )}
            </View>
          );
          })}
        </View>
      </ScrollView>
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
  segmentBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  segmentBtnActive: { backgroundColor: '#0EA5A4' },
  segmentText: { color: '#E2E8F0', fontWeight: '700' },
  list: { paddingBottom: 24 },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10
  },
  cardTitle: { color: '#F8FAFC', fontWeight: '700', fontSize: 18 },
  cardSub: { color: '#94A3B8', marginTop: 5 },
  cardMeta: { color: '#CBD5E1', marginTop: 10 },
  cardTags: { color: '#2DD4BF', marginTop: 8 },
  sectionTitle: { color: '#E2E8F0', marginTop: 12, marginBottom: 8, fontWeight: '700' },
  sessionBox: {
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    marginBottom: 8
  },
  sessionTitle: { color: '#F8FAFC', fontWeight: '700', marginBottom: 6, fontSize: 12 },
  exerciseLine: { color: '#CBD5E1', marginBottom: 3, fontSize: 12 },
  emptyText: { color: '#94A3B8', fontSize: 12 }
});
