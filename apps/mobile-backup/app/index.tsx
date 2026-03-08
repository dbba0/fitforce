import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { AUTH_BYPASS_ENABLED } from '@/constants/flags';

export default function Index() {
  const { user, loading } = useAuth();

  if (AUTH_BYPASS_ENABLED) {
    return <Redirect href="/(tabs)" />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator color="#2DD4BF" />
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/auth'} />;
}
