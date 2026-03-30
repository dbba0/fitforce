import React, { useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  useColorScheme,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface CardInputProps extends Omit<TextInputProps, "style"> {
  icon?: keyof typeof Ionicons.glyphMap;
  focused?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function CardInput({
  icon,
  focused,
  containerStyle,
  onFocus,
  onBlur,
  value,
  ...rest
}: CardInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [isFocusedInternal, setIsFocusedInternal] = useState(false);
  const isFocused = focused ?? isFocusedInternal;

  return (
    <Pressable
      style={[
        styles.base,
        {
          backgroundColor: theme.cardElevated,
          borderColor: isFocused ? theme.accent : "transparent",
        },
        containerStyle,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={isFocused ? theme.accent : theme.textMuted} /> : null}
      <TextInput
        {...rest}
        value={value}
        onFocus={(e) => {
          setIsFocusedInternal(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocusedInternal(false);
          onBlur?.(e);
        }}
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.text, fontFamily: Typography.body }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
