import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Image } from "expo-image";

type ExerciseGifProps = {
  exerciseDbId?: string;
  fallback: ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
};

export default function ExerciseGif({
  exerciseDbId,
  fallback,
  size = 190,
  style,
  backgroundColor = "#101218",
  borderColor = "#2A2E37",
}: ExerciseGifProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const gifUrl = useMemo(() => {
    if (!exerciseDbId) return null;
    return `https://v2.exercisedb.io/image/${exerciseDbId}.gif`;
  }, [exerciseDbId]);

  useEffect(() => {
    setLoadFailed(false);
  }, [exerciseDbId]);

  if (!gifUrl || loadFailed) {
    return <>{fallback}</>;
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          borderColor,
          backgroundColor,
        },
        style,
      ]}
    >
      <Image
        source={{ uri: gifUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
          },
        ]}
        contentFit="contain"
        autoplay
        cachePolicy="memory-disk"
        transition={150}
        onError={() => setLoadFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 170,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    alignSelf: "center",
  },
});
