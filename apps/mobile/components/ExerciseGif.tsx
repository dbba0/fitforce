import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Image } from "expo-image";

type ExerciseGifProps = {
  exerciseDbId?: string;
  imageUrl?: string;
  fallback: ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  showLoader?: boolean;
};

export default function ExerciseGif({
  exerciseDbId,
  imageUrl,
  fallback,
  size = 190,
  style,
  backgroundColor = "#101218",
  borderColor = "#2A2E37",
  showLoader = true,
}: ExerciseGifProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const visualUrl = useMemo(() => {
    const directImage = imageUrl?.trim();
    if (directImage) return directImage;
    if (!exerciseDbId) return null;
    return `https://v2.exercisedb.io/image/${exerciseDbId}.gif`;
  }, [exerciseDbId, imageUrl]);

  useEffect(() => {
    setLoadFailed(false);
    setLoading(true);
  }, [exerciseDbId, imageUrl]);

  if (!visualUrl || loadFailed) {
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
        source={{ uri: visualUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            opacity: showLoader && loading ? 0 : 1,
          },
        ]}
        contentFit="contain"
        autoplay
        cachePolicy="memory-disk"
        transition={150}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setLoadFailed(true);
        }}
      />
      {showLoader && loading ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="small" color="#F55F2B" />
        </View>
      ) : null}
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
