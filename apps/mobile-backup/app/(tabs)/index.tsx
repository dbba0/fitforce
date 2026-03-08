import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import api from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { DashboardSummary } from '@/types';

const width = Dimensions.get('window').width - 32;

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [weekly, setWeekly] = useState<{ label: string; calories: number; sessions: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get('/dashboard');
      setSummary(data.summary);
      setWeekly(data.weeklyGraph || []);
    };

    load().catch(() => {
      setSummary({
        totalSessions: 0,
        totalMinutes: 0,
        totalCalories: 0,
        bestPerformance: 0,
        weekOverWeekCaloriesDelta: 0
      });
      setWeekly([]);
    });
  }, []);

  const objectivePercent = useMemo(() => {
    const done = summary?.totalSessions ?? 0;
    const target = 5;
    return Math.min(100, Math.round((done / target) * 100));
  }, [summary]);

  return (
    <Screen style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#134E4A', '#0B1220']} style={styles.hero}>
          <Text style={styles.heroTitle}>Salut {user?.fullName || 'Athlete'}</Text>
          <Text style={styles.heroSub}>Discipline today. Results tomorrow.</Text>

          <Pressable style={styles.cta} onPress={() => router.push('/(tabs)/workout')}>
            <Ionicons name="play" size={16} color="#042F2E" />
            <Text style={styles.ctaText}>Demarrer seance</Text>
          </Pressable>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
          <View style={styles.cardStat}>
            <Text style={styles.cardLabel}>Sessions</Text>
            <Text style={styles.cardValue}>{summary?.totalSessions ?? 0}</Text>
          </View>
          <View style={styles.cardStat}>
            <Text style={styles.cardLabel}>Minutes</Text>
            <Text style={styles.cardValue}>{summary?.totalMinutes ?? 0}</Text>
          </View>
          <View style={styles.cardStat}>
            <Text style={styles.cardLabel}>Calories</Text>
            <Text style={styles.cardValue}>{summary?.totalCalories ?? 0}</Text>
          </View>
          <View style={styles.cardStat}>
            <Text style={styles.cardLabel}>Record kg</Text>
            <Text style={styles.cardValue}>{summary?.bestPerformance ?? 0}</Text>
          </View>
        </ScrollView>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Plan du jour</Text>
          <Text style={styles.panelText}>1. Echauffement 8 min • 2. Full body 35 min • 3. Core 10 min</Text>
          <Text style={styles.panelHint}>Objectif: execution propre + progression 2.5%</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Streak</Text>
          <Text style={styles.streakValue}>{user?.streakDays ?? 0} jours consecutifs</Text>
          <Text style={styles.panelHint}>Prochain badge a 7 jours</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Objectif semaine</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${objectivePercent}%` }]} />
          </View>
          <Text style={styles.panelHint}>{objectivePercent}% complete (cible: 5 seances)</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Tendance hebdomadaire</Text>
          <LineChart
            data={{
              labels: weekly.map((d) => d.label),
              datasets: [{ data: weekly.length ? weekly.map((d) => d.calories) : [0] }]
            }}
            width={width}
            height={220}
            chartConfig={{
              backgroundGradientFrom: '#111827',
              backgroundGradientTo: '#020617',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(45,212,191,${opacity})`,
              labelColor: (opacity = 1) => `rgba(203,213,225,${opacity})`
            }}
            bezier
            style={{ borderRadius: 12, marginTop: 8 }}
          />
          <Text style={styles.deltaText}>
            {summary?.weekOverWeekCaloriesDelta ?? 0} kcal vs semaine precedente
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#020617' },
  hero: {
    marginTop: 4,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1F2937'
  },
  heroTitle: { color: '#F8FAFC', fontSize: 30, fontWeight: '900' },
  heroSub: { color: '#A7F3D0', marginTop: 6, marginBottom: 14, fontSize: 14 },
  cta: {
    backgroundColor: '#2DD4BF',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  ctaText: { color: '#042F2E', fontWeight: '800' },
  cardsRow: { marginVertical: 14, gap: 10 },
  cardStat: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    width: 125
  },
  cardLabel: { color: '#94A3B8', fontSize: 12 },
  cardValue: { color: '#F8FAFC', fontSize: 24, fontWeight: '800', marginTop: 6 },
  panel: {
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    marginBottom: 12
  },
  panelTitle: { color: '#F8FAFC', fontWeight: '800', fontSize: 16, marginBottom: 8 },
  panelText: { color: '#CBD5E1', lineHeight: 20 },
  panelHint: { color: '#94A3B8', marginTop: 8 },
  streakValue: { color: '#FB923C', fontWeight: '900', fontSize: 24 },
  track: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  fill: { height: '100%', borderRadius: 999, backgroundColor: '#2DD4BF' },
  deltaText: { color: '#2DD4BF', marginTop: 10, fontWeight: '700' }
});
