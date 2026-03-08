import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import api from '@/api/client';

export default function NutritionScreen() {
  const [summary, setSummary] = useState<any>(null);
  const [calories, setCalories] = useState('600');
  const [water, setWater] = useState('500');

  const load = async () => {
    const { data } = await api.get('/nutrition/summary');
    setSummary(data.today);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const addMeal = async () => {
    try {
      await api.post('/nutrition/log', { calories: Number(calories), mealType: 'lunch' });
      await load();
    } catch {
      Alert.alert('Erreur', 'Ajout repas impossible');
    }
  };

  const addWater = async () => {
    try {
      await api.post('/nutrition/hydration', { ml: Number(water) });
      await load();
    } catch {
      Alert.alert('Erreur', 'Ajout hydratation impossible');
    }
  };

  return (
    <Screen style={styles.root}>
      <Text style={styles.title}>Nutrition Premium</Text>
      <View style={styles.card}>
        <Text style={styles.main}>Calories du jour: {summary?.calories ?? 0}</Text>
        <Text style={styles.main}>Hydratation: {summary?.hydrationMl ?? 0} ml</Text>
        <Text style={styles.muted}>Suggestion auto: {summary?.calorieSuggestion ?? 0} kcal/jour</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Ajouter calories</Text>
        <TextInput value={calories} onChangeText={setCalories} keyboardType="numeric" style={styles.input} />
        <Pressable onPress={addMeal} style={styles.button}><Text style={styles.btnText}>Ajouter repas</Text></Pressable>

        <Text style={[styles.label, { marginTop: 12 }]}>Ajouter eau (ml)</Text>
        <TextInput value={water} onChangeText={setWater} keyboardType="numeric" style={styles.input} />
        <Pressable onPress={addWater} style={styles.button}><Text style={styles.btnText}>Ajouter hydratation</Text></Pressable>
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
  main: { color: '#F8FAFC', fontSize: 16, marginBottom: 6 },
  muted: { color: '#94A3B8' },
  label: { color: '#CBD5E1', marginBottom: 6 },
  input: {
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    marginBottom: 8
  },
  button: { backgroundColor: '#0EA5A4', borderRadius: 10, paddingVertical: 12 },
  btnText: { color: '#032B2B', textAlign: 'center', fontWeight: '800' }
});
