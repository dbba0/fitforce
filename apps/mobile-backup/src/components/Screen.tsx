import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= 1024 ? 24 : 16;

  return (
    <SafeAreaView style={[styles.container, style]}>
      <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingTop: 8
  }
});
