import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#020617', borderTopColor: '#111827' },
        tabBarActiveTintColor: '#2DD4BF',
        tabBarInactiveTintColor: '#64748B'
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programmes',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="builder"
        options={{
          title: 'Builder',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Train',
          tabBarIcon: ({ color, size }) => <Ionicons name="timer" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
