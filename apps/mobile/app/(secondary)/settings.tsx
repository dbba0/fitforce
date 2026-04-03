import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  useColorScheme,
  Switch,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Language } from "@/lib/i18n";
import { Colors } from "@/constants/colors";
import { PrimaryButton, SectionLabel } from "@/components/ui";

function SettingsRow({ icon, label, value, onPress, rightEl, color }: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightEl?: React.ReactNode;
  color?: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const content = (
    <View style={[styles.settingsRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.settingsIcon, { backgroundColor: (color ?? theme.accent) + "20" }]}>
        <Ionicons name={icon as any} size={18} color={color ?? theme.accent} />
      </View>
      <Text style={[styles.settingsLabel, { color: theme.text, fontFamily: "DMSans_500Medium" }]}>{label}</Text>
      <View style={styles.settingsRight}>
        {value ? (
          <Text style={[styles.settingsValue, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>{value}</Text>
        ) : null}
        {rightEl ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} /> : null)}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

export default function SettingsScreen() {
  const { t, language, setLanguage, languages } = useLanguage();
  const { logout, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [policyModal, setPolicyModal] = useState<{ title: string; content: string } | null>(null);

  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showGoals: true,
    showAchievements: true,
    showStats: true,
    showPosts: true,
  });

  useEffect(() => {
    if (isAuthenticated) {
      apiRequest("GET", "/api/privacy")
        .then((res) => res.json())
        .then((data) => {
          const ps = data?.privacy ?? data;
          if (ps) setPrivacy({
            showProfile: ps.showProfile ?? true,
            showGoals: ps.showGoals ?? true,
            showAchievements: ps.showAchievements ?? true,
            showStats: ps.showStats ?? true,
            showPosts: ps.showPosts ?? true,
          });
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const togglePrivacy = (key: keyof typeof privacy) => {
    const next = { ...privacy, [key]: !privacy[key] };
    setPrivacy(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    apiRequest("PUT", "/api/privacy", next).catch(() => {
      setPrivacy(privacy);
    });
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logout();
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  const currentLang = languages.find((l) => l.code === language);

  const handleSelectLang = (code: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLanguage(code);
    setShowLangPicker(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? webBottomPadding + 84 : 100,
          paddingHorizontal: 20,
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Syne_800ExtraBold" }]}>
            {t("settings")}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <SectionLabel style={styles.sectionLabel} textStyle={{ color: theme.textSecondary }}>
            {t("language")}
          </SectionLabel>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <SettingsRow
              icon="globe-outline"
              label={t("language")}
              value={currentLang?.nativeName}
              color="#4CAF7D"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLangPicker(true);
              }}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(400)}>
          <SectionLabel style={styles.sectionLabel} textStyle={{ color: theme.textSecondary }}>
            {t("theme")}
          </SectionLabel>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <SettingsRow
              icon="moon-outline"
              label={isDark ? t("darkMode") : t("lightMode")}
              color={theme.accent}
              rightEl={
                <View style={[styles.themeBadge, { backgroundColor: `${theme.accent}20` }]}>
                  <Ionicons name={isDark ? "moon" : "sunny"} size={14} color={theme.accent} />
                </View>
              }
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <SectionLabel style={styles.sectionLabel} textStyle={{ color: theme.textSecondary }}>
            {t("notifications")}
          </SectionLabel>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <SettingsRow
              icon="notifications-outline"
              label={t("notifications")}
              color="#FF6B2C"
              rightEl={
                <Switch
                  value={notificationsOn}
                  onValueChange={(v) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNotificationsOn(v);
                  }}
                  trackColor={{ false: theme.border, true: theme.accent + "80" }}
                  thumbColor={notificationsOn ? theme.accent : theme.textMuted}
                />
              }
            />
          </View>
        </Animated.View>

        {isAuthenticated && (
          <Animated.View entering={FadeInDown.delay(260).duration(400)}>
            <SectionLabel style={styles.sectionLabel} textStyle={{ color: theme.textSecondary }}>
              {t("privacySettings")}
            </SectionLabel>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              {([
                { key: "showProfile" as const, icon: "person-outline", label: t("showProfile"), color: "#4CAF50" },
                { key: "showGoals" as const, icon: "flag-outline", label: t("showGoals"), color: "#FFB547" },
                { key: "showAchievements" as const, icon: "trophy-outline", label: t("showAchievements"), color: "#FFD700" },
                { key: "showStats" as const, icon: "stats-chart-outline", label: t("showStats"), color: "#2196F3" },
                { key: "showPosts" as const, icon: "chatbubbles-outline", label: t("showPosts"), color: "#E91E8C" },
              ]).map((item) => (
                <SettingsRow
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  color={item.color}
                  rightEl={
                    <Switch
                      value={privacy[item.key]}
                      onValueChange={() => togglePrivacy(item.key)}
                      trackColor={{ false: theme.border, true: theme.accent + "80" }}
                      thumbColor={privacy[item.key] ? theme.accent : theme.textMuted}
                    />
                  }
                />
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(320).duration(400)}>
          <SectionLabel style={styles.sectionLabel} textStyle={{ color: theme.textSecondary }}>
            {t("about")}
          </SectionLabel>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <SettingsRow
              icon="information-circle-outline"
              label={t("version")}
              value="2.2.0"
              color="#2196F3"
            />
            <SettingsRow
              icon="shield-outline"
              label={t("privacyPolicy")}
              color="#E91E8C"
              onPress={() => setPolicyModal({ title: t("privacyPolicy"), content: t("privacyContent") })}
            />
            <SettingsRow
              icon="document-text-outline"
              label={t("termsOfService")}
              color="#FFB547"
              onPress={() => setPolicyModal({ title: t("termsOfService"), content: t("termsContent") })}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(380).duration(400)} style={styles.appInfo}>
          <Text style={[styles.appName, { color: theme.accent, fontFamily: "Syne_800ExtraBold" }]}>FitForce</Text>
          <Text style={[styles.appTagline, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
            {t("startYourJourney")}
          </Text>
        </Animated.View>

        {isAuthenticated && (
          <Animated.View entering={FadeInDown.delay(440).duration(400)} style={{ paddingBottom: 20 }}>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutBtn,
                { backgroundColor: "#FF3B3020", borderColor: "#FF3B30", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={[styles.logoutBtnText, { fontFamily: "DMSans_600SemiBold" }]}>
                {t("logout")}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={showLangPicker} animationType="slide" transparent onRequestClose={() => setShowLangPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLangPicker(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]}>
              {t("selectLanguage")}
            </Text>
            {languages.map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => handleSelectLang(lang.code)}
                style={({ pressed }) => [
                  styles.langRow,
                  {
                    backgroundColor: language === lang.code ? theme.accent + "15" : "transparent",
                    borderColor: language === lang.code ? theme.accent : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.langInfo}>
                  <Text style={[styles.langNative, { color: theme.text, fontFamily: "DMSans_600SemiBold" }]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={[styles.langName, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                    {lang.name}
                  </Text>
                </View>
                {language === lang.code && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                )}
                {lang.rtl && (
                  <View style={[styles.rtlBadge, { backgroundColor: theme.border }]}>
                    <Text style={[styles.rtlText, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>RTL</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={policyModal !== null} animationType="slide" transparent onRequestClose={() => setPolicyModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPolicyModal(null)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]}>
              {policyModal?.title}
            </Text>
            <Text style={[styles.policyText, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
              {policyModal?.content}
            </Text>
            <PrimaryButton label={t("close")} onPress={() => setPolicyModal(null)} style={styles.policyCloseBtn} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 24 },
  title: { fontSize: 28 },
  sectionLabel: {
    marginBottom: 8,
    marginTop: 20,
  },
  card: { borderRadius: 16, overflow: "hidden" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsLabel: { flex: 1, fontSize: 15 },
  settingsRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingsValue: { fontSize: 14 },
  themeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  appInfo: { alignItems: "center", paddingVertical: 32, gap: 6 },
  appName: { fontSize: 28, letterSpacing: 1 },
  appTagline: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, marginBottom: 16 },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  langInfo: { flex: 1 },
  langNative: { fontSize: 16, marginBottom: 2 },
  langName: { fontSize: 12 },
  rtlBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rtlText: { fontSize: 10 },
  policyText: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  policyCloseBtn: { height: 50, borderRadius: 14 },
  logoutBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  logoutBtnText: { color: "#FF3B30", fontSize: 16 },
});
