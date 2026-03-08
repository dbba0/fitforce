import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/constants/config';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('demo@fitpulse.app');
  const [password, setPassword] = useState('password123');

  const submit = async () => {
    try {
      if (isSignUp) {
        await signUp({
          fullName,
          email,
          password,
          level: 'debutant',
          goalType: 'recomposition'
        });
      } else {
        await signIn(email, password);
      }
    } catch (e: any) {
      const serverMessage = e?.response?.data?.message;
      const networkMessage = e?.message;
      Alert.alert(
        'Erreur',
        `${serverMessage || networkMessage || 'Action impossible'}\nAPI: ${API_BASE_URL}`
      );
    }
  };

  return (
    <LinearGradient colors={['#020617', '#0B1220', '#111827']} style={styles.container}>
      <Text style={styles.brand}>FitPulse</Text>
      <Text style={styles.title}>Ton coach intelligent</Text>
      {isSignUp ? (
        <TextInput
          placeholder="Nom"
          placeholderTextColor="#64748B"
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
        />
      ) : null}
      <TextInput
        placeholder="Email"
        placeholderTextColor="#64748B"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Mot de passe"
        placeholderTextColor="#64748B"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>{isSignUp ? 'Créer un compte' : 'Connexion'}</Text>
      </Pressable>

      <Pressable onPress={() => setIsSignUp((v) => !v)}>
        <Text style={styles.link}>
          {isSignUp ? 'Déjà inscrit ? Se connecter' : 'Pas de compte ? Créer un compte'}
        </Text>
      </Pressable>

      <Text style={styles.social}>Google / Apple sign-in à brancher via OAuth Expo</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  brand: { color: '#2DD4BF', fontSize: 30, fontWeight: '800', marginBottom: 10 },
  title: { color: '#F8FAFC', fontSize: 20, marginBottom: 28 },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    color: '#F8FAFC'
  },
  button: {
    backgroundColor: '#0EA5A4',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16
  },
  buttonText: { color: '#032B2B', textAlign: 'center', fontWeight: '800' },
  link: { color: '#CBD5E1', textAlign: 'center' },
  social: { color: '#64748B', textAlign: 'center', marginTop: 20, fontSize: 12 }
});
