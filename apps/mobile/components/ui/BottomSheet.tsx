import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(560);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      backdropOpacity.value = withTiming(1, { duration: 220 });
      return;
    }

    translateY.value = withTiming(560, { duration: 180 });
    backdropOpacity.value = withTiming(0, { duration: 180 });
    const timer = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timer);
  }, [visible, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetPaddingBottom = useMemo(() => insets.bottom + 16, [insets.bottom]);

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            paddingBottom: sheetPaddingBottom,
          },
          sheetStyle,
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        {title ? (
          <Text style={[styles.title, { color: theme.text, fontFamily: Typography.title }]}>{title}</Text>
        ) : null}
        <View>{children}</View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
  },
});
