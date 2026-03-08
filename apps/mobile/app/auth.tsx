import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

type Mode = "login" | "register";

export default function AuthScreen() {
  const { t } = useLanguage();
  const { login, register, continueAsGuest } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const apiUrl = getApiUrl();

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

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <LinearGradient
      colors={["#0D0D0D", "#1A1A2E", "#0D0D0D"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={[styles.content, { paddingTop: insets.top + webTop + 40, paddingBottom: insets.bottom + 20 }]}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.brandSection}>
            <LinearGradient
              colors={["#FF6B2C", "#FF8C5A"]}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="fitness" size={40} color="#fff" />
            </LinearGradient>
            <Text style={[styles.brandName, { fontFamily: "Outfit_800ExtraBold" }]}>FitForce</Text>
            <Text style={[styles.brandTagline, { fontFamily: "Outfit_400Regular" }]}>
              {mode === "login" ? t("login") : t("register")}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.formSection}>
            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { fontFamily: "Outfit_500Medium" }]}>
                  {t("displayName")}
                </Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { fontFamily: "Outfit_400Regular" }]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={t("displayName")}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    autoCapitalize="words"
                    testID="displayName"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontFamily: "Outfit_500Medium" }]}>
                {t("email")}
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: "Outfit_400Regular" }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("email")}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontFamily: "Outfit_500Medium" }]}>
                {t("password")}
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily: "Outfit_400Regular", flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("password")}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  testID="password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="rgba(255,255,255,0.4)" />
                </Pressable>
              </View>
            </View>

            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { fontFamily: "Outfit_500Medium" }]}>
                  {t("confirmPassword")}
                </Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { fontFamily: "Outfit_400Regular" }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t("confirmPassword")}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    testID="confirmPassword"
                  />
                </View>
              </View>
            )}

            {!!error && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.errorWrap}>
                <Ionicons name="warning-outline" size={16} color="#FF4444" />
                <Text style={[styles.errorText, { fontFamily: "Outfit_500Medium" }]}>{error}</Text>
              </Animated.View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                { opacity: pressed || loading ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={["#FF6B2C", "#FF8C5A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name={mode === "login" ? "log-in-outline" : "person-add-outline"} size={20} color="#fff" />
                    <Text style={[styles.submitText, { fontFamily: "Outfit_700Bold" }]}>
                      {mode === "login" ? t("login") : t("register")}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable onPress={toggleMode} style={styles.toggleWrap}>
              <Text style={[styles.toggleText, { fontFamily: "Outfit_400Regular" }]}>
                {mode === "login" ? t("createAccount") : t("alreadyHaveAccount")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                continueAsGuest();
              }}
              style={styles.guestWrap}
            >
              <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={[styles.guestText, { fontFamily: "Outfit_500Medium" }]}>
                {t("continueAsGuest")}
              </Text>
            </Pressable>

            <Text style={[styles.apiHint, { fontFamily: "Outfit_400Regular" }]}>
              API: {apiUrl}
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  brandSection: { alignItems: "center", marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  brandName: { fontSize: 36, color: "#fff", marginBottom: 4 },
  brandTagline: { fontSize: 16, color: "rgba(255,255,255,0.6)" },
  formSection: { gap: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginLeft: 4 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  inputIcon: { paddingLeft: 14 },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  eyeBtn: { padding: 14 },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,68,68,0.12)",
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: "#FF4444", fontSize: 13, flex: 1 },
  submitBtn: { marginTop: 4 },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
  },
  submitText: { color: "#fff", fontSize: 17 },
  toggleWrap: { alignItems: "center", paddingVertical: 12 },
  toggleText: { color: "#FF6B2C", fontSize: 14 },
  guestWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  guestText: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  apiHint: { color: "rgba(255,255,255,0.35)", fontSize: 11, textAlign: "center", marginTop: 4 },
});
