import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface SetDotsProps {
  total: number;
  current: number;
  done?: number;
  style?: StyleProp<ViewStyle>;
}

export function SetDots({ total, current, done, style }: SetDotsProps) {
  const safeTotal = Math.max(0, total);
  const doneIndex = typeof done === "number" ? done : current - 1;

  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: safeTotal }).map((_, index) => {
        const isDone = index <= doneIndex;
        const isCurrent = index === current;
        const color = isDone ? "#F55F2B" : isCurrent ? "#FFFFFF" : "#242424";
        const borderColor = isCurrent ? "rgba(255,255,255,0.4)" : "transparent";

        return (
          <View
            key={`set-dot-${index}`}
            style={[styles.dot, { backgroundColor: color, borderColor }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
});
