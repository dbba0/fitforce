import React from "react";
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "@/hooks";
import { MiniStatCard, MiniStatCardData } from "@/ui/MiniStatCard";

export interface MiniStatCarouselProps {
  items: MiniStatCardData[];
  onItemPress?: (item: MiniStatCardData, index: number) => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
}

export function MiniStatCarousel({
  items,
  onItemPress,
  style,
  contentContainerStyle,
  cardStyle,
}: MiniStatCarouselProps) {
  const { spacing } = useAppTheme();

  return (
    <View style={[{ marginBottom: spacing[3] }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {items.map((item, index) => (
          <MiniStatCard
            key={item.id}
            {...item}
            style={cardStyle}
            onPress={onItemPress ? () => onItemPress(item, index) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export type { MiniStatCardData };

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingRight: 8,
  },
});
