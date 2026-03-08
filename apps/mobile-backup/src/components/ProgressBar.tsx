import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  done: number;
  target: number;
  percent: number;
};

export function ProgressBar({ label, done, target, percent }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{done}/{target}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, percent)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#E2E8F0', fontSize: 13 },
  count: { color: '#2DD4BF', fontWeight: '700' },
  track: {
    height: 10,
    backgroundColor: '#1F2937',
    borderRadius: 999
  },
  fill: {
    height: '100%',
    backgroundColor: '#0EA5A4',
    borderRadius: 999
  }
});
