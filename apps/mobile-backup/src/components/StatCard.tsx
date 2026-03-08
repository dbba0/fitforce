import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string | number;
  subtitle?: string;
};

export function StatCard({ label, value, subtitle }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 14,
    minWidth: 150,
    marginRight: 10
  },
  label: {
    color: '#94A3B8',
    fontSize: 12
  },
  value: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8
  },
  subtitle: {
    color: '#2DD4BF',
    marginTop: 6,
    fontSize: 12
  }
});
