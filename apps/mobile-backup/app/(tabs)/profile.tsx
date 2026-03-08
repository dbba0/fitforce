import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import api from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const activatePremium = async () => {
    try {
      await api.post('/billing/mock-activate');
      Alert.alert('Premium', 'Premium activé (mock)');
    } catch {
      Alert.alert('Erreur', 'Activation impossible');
    }
  };

  return (
    <Screen style={styles.root}>
      <Text style={styles.title}>Profil</Text>
      <View style={styles.card}>
        <Text style={styles.line}>Nom: {user?.fullName}</Text>
        <Text style={styles.line}>Email: {user?.email}</Text>
        <Text style={styles.line}>Niveau: {user?.level}</Text>
        <Text style={styles.line}>Objectif: {user?.goalType}</Text>
        <Text style={styles.line}>Premium: {user?.isPremium ? 'Oui' : 'Non'}</Text>
      </View>

      <Pressable onPress={activatePremium} style={styles.buttonPrimary}>
        <Text style={styles.btnPrimaryText}>Passer en Premium</Text>
      </Pressable>

      <Pressable onPress={signOut} style={styles.buttonGhost}>
        <Text style={styles.btnGhostText}>Se déconnecter</Text>
      </Pressable>
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
    marginBottom: 16
  },
  line: { color: '#CBD5E1', marginBottom: 7 },
  buttonPrimary: { backgroundColor: '#FB923C', borderRadius: 12, paddingVertical: 13, marginBottom: 10 },
  btnPrimaryText: { color: '#291406', textAlign: 'center', fontWeight: '800' },
  buttonGhost: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: '#334155' },
  btnGhostText: { color: '#E2E8F0', textAlign: 'center', fontWeight: '700' }
});
