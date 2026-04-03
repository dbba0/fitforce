import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { TrainingLogo } from "@/components/TrainingLogo";
import { PrimaryButton } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

type Mode = "login" | "register";

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

export default function AuthScreen() {
  const { t } = useLanguage();
  const { login, register, continueAsGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const webTop = Platform.OS === "web" ? 67 : 0;

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async () => {
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!email.trim() || !password.trim()) {
      setError(t("loginError"));
      return;
    }
    if (!validateEmail(email.trim())) {
      setError(t("invalidEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (mode === "register") {
      if (!displayName.trim()) {
        setError(t("loginError"));
        return;
      }
      if (password !== confirmPassword) {
        setError(t("passwordsMismatch"));
        return;
      }
    }

    setLoading(true);
    try {
      let result;
      if (mode === "login") {
        result = await login(email.trim(), password);
      } else {
        result = await register(email.trim(), password, displayName.trim());
      }
      if (!result.success) {
        setError(result.error || (mode === "login" ? t("loginError") : t("registerError")));
      }
    } catch {
      setError(mode === "login" ? t("loginError") : t("registerError"));
    } finally {
      setLoading(false);
    }
  };

  const setAuthMode = (next: Mode) => {
    setMode(next);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t("authForgotPasswordTitle"), t("authForgotPasswordMessage"));
  };

  const handleSocialPress = (provider: "apple" | "google") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const providerLabel = provider === "apple" ? t("authProviderApple") : t("authProviderGoogle");
    Alert.alert(
      t("authSocialSoonTitle"),
      formatTemplate(t("authSocialSoonMessage"), { provider: providerLabel })
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + webTop + 20,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 28,
          }}
        >
          <Animated.View entering={FadeInDown.duration(550)} style={styles.brandSection}>
            <View style={[styles.logoCircle, { backgroundColor: theme.accent }]}> 
              <TrainingLogo size={36} color="#fff" />
            </View>
            <Text style={[styles.brandName, { fontFamily: Typography.titleStrong, color: theme.text }]}>FitForce</Text>
            <Text style={[styles.brandTagline, { fontFamily: Typography.body, color: theme.textSecondary }]}> 
              {t("authTagline")}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(160).duration(450)} style={styles.formSection}>
            <View style={[styles.modeTabs, { backgroundColor: theme.cardElevated, borderColor: theme.border }]}> 
              {(["login", "register"] as const).map((modeKey) => {
                const active = mode === modeKey;
                return (
                  <Pressable
                    key={modeKey}
                    onPress={() => setAuthMode(modeKey)}
                    style={({ pressed }) => [
                      styles.modeTab,
                      active
                        ? {
                            backgroundColor: theme.accent,
                            shadowColor: theme.accent,
                            shadowOpacity: isDark ? 0.3 : 0.18,
                            shadowRadius: 12,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: 2,
                          }
                        : null,
                      !active && pressed ? { opacity: 0.8 } : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeTabText,
                        {
                          color: active ? "#fff" : theme.textSecondary,
                          fontFamily: active ? Typography.bodyBold : Typography.bodySemiBold,
                        },
                      ]}
                    >
                      {modeKey === "login" ? t("login") : t("register")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mode === "register" ? (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary, fontFamily: Typography.body }]}>
                  {t("displayName")}
                </Text>
                <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                  <Ionicons name="person-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text, fontFamily: Typography.bodyRegular }]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={t("displayName")}
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="words"
                    testID="displayName"
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary, fontFamily: Typography.body }]}>{t("email")}</Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontFamily: Typography.bodyRegular }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("email")}
                  placeholderTextColor={theme.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary, fontFamily: Typography.body }]}>{t("password")}</Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontFamily: Typography.bodyRegular, flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("password")}
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  testID="password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={theme.textMuted} />
                </Pressable>
              </View>
            </View>

            {mode === "register" ? (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary, fontFamily: Typography.body }]}>
                  {t("confirmPassword")}
                </Text>
                <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                  <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text, fontFamily: Typography.bodyRegular }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t("confirmPassword")}
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    testID="confirmPassword"
                  />
                </View>
              </View>
            ) : null}

            {!!error ? (
              <Animated.View
                entering={FadeIn.duration(260)}
                style={[styles.errorWrap, { backgroundColor: `${theme.error}1F`, borderColor: `${theme.error}55` }]}
              >
                <Ionicons name="warning-outline" size={16} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error, fontFamily: Typography.body }]}>{error}</Text>
              </Animated.View>
            ) : null}

            <PrimaryButton
              label={mode === "login" ? t("login") : t("register")}
              loading={loading}
              disabled={loading}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />

            {mode === "login" ? (
              <Pressable onPress={openForgotPassword} style={styles.forgotWrap}>
                <Text style={[styles.forgotText, { color: theme.textSecondary, fontFamily: Typography.body }]}>
                  {t("authForgotPassword")}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>
                {t("authDividerOr")}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <View style={styles.socialStack}>
              <Pressable
                onPress={() => handleSocialPress("apple")}
                style={({ pressed }) => [
                  styles.socialBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="logo-apple" size={16} color={theme.text} />
                <Text style={[styles.socialText, { color: theme.text, fontFamily: Typography.bodySemiBold }]}>
                  {t("authContinueApple")}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSocialPress("google")}
                style={({ pressed }) => [
                  styles.socialBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="logo-google" size={16} color={theme.text} />
                <Text style={[styles.socialText, { color: theme.text, fontFamily: Typography.bodySemiBold }]}>
                  {t("authContinueGoogle")}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                continueAsGuest();
              }}
              style={styles.guestWrap}
            >
              <Text style={[styles.guestText, { color: theme.textSecondary, fontFamily: Typography.body }]}>
                {t("continueAsGuest")}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  brandSection: {
    alignItems: "flex-start",
    marginBottom: 28,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brandName: {
    fontSize: 32,
    color: "#fff",
    lineHeight: 34,
    marginBottom: 6,
  },
  brandTagline: {
    fontSize: 14,
    lineHeight: 20,
  },
  formSection: {
    gap: 12,
  },
  modeTabs: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    marginBottom: 8,
  },
  modeTab: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabText: {
    fontSize: 13,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 52,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  eyeBtn: {
    padding: 14,
  },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  submitBtn: {
    marginTop: 2,
    borderRadius: 999,
  },
  forgotWrap: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotText: {
    fontSize: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
    marginBottom: 2,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 11,
  },
  socialStack: {
    gap: 10,
  },
  socialBtn: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  socialText: {
    fontSize: 13,
  },
  guestWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    paddingBottom: 4,
  },
  guestText: {
    fontSize: 12,
  },
});
