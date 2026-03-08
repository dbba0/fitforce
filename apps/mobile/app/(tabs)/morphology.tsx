import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

type SideKey = "front" | "side" | "back";

function ScoreBar({
  label,
  value,
  max = 100,
  color,
  theme,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  theme: any;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.rowBetween}>
        <Text style={[styles.smallLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>{label}</Text>
        <Text style={[styles.smallValue, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{value}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function MorphologyScreen() {
  const { t } = useLanguage();
  const { isGuest, user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const [photos, setPhotos] = useState<Record<SideKey, string>>({
    front: "",
    side: "",
    back: "",
  });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const { data: historyData, refetch: refetchHistory } = useQuery<{ history: any[] }>({
    queryKey: ["/api/morphology/history"],
  });

  const history = historyData?.history || [];

  const objective = useMemo(() => user?.objective || "recomposition", [user?.objective]);

  const pickPhoto = async (key: SideKey) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotos((prev) => ({ ...prev, [key]: result.assets[0].uri }));
    }
  };

  const runAnalysis = async () => {
    if (!photos.front && !photos.side && !photos.back) {
      Alert.alert("Morphologie IA", "Ajoute au moins une photo (face, profil ou dos).");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest(
        "POST",
        "/api/morphology/analyze",
        {
          photos,
          objective,
        },
        { timeoutMs: 30000 },
      );
      const data = await res.json();
      setAnalysis(data.analysis);
      refetchHistory();
    } catch (error: any) {
      const baseApi = getApiUrl();
      const message = error?.message || "Analyse impossible.";
      Alert.alert("Morphologie IA", `${message}\nAPI: ${baseApi}`);
    } finally {
      setLoading(false);
    }
  };

  if (isGuest) {
    return (
      <View style={[styles.guestWrap, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed-outline" size={44} color={theme.textMuted} />
        <Text style={[styles.guestTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Connexion requise</Text>
        <Text style={[styles.guestText, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
          Connecte toi pour activer l analyse IA et garder ton historique morphologique.
        </Text>
        <Pressable onPress={() => logout()} style={[styles.guestBtn, { backgroundColor: theme.accent }]}>
          <Text style={[styles.guestBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("login")}</Text>
        </Pressable>
      </View>
    );
  }

  const report = analysis?.report;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 16,
        paddingBottom: Platform.OS === "web" ? 120 : 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>Morphologie IA</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
          Upload des photos, estimation morphologique, recommandations entrainement + nutrition.
        </Text>
      </View>

      <View style={styles.photosRow}>
        {(["front", "side", "back"] as SideKey[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => pickPhoto(key)}
            style={[styles.photoSlot, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            {photos[key] ? (
              <Image source={{ uri: photos[key] }} style={styles.photoPreview} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={20} color={theme.textMuted} />
                <Text style={[styles.photoLabel, { color: theme.textMuted, fontFamily: "Outfit_500Medium" }]}>
                  {key === "front" ? "Face" : key === "side" ? "Profil" : "Dos"}
                </Text>
              </>
            )}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={runAnalysis}
        disabled={loading}
        style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="sparkles-outline" size={18} color="#fff" />
            <Text style={[styles.primaryText, { fontFamily: "Outfit_700Bold" }]}>Lancer analyse IA</Text>
          </>
        )}
      </Pressable>

      {!!report && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Resume</Text>
          <Text style={[styles.disclaimer, { color: theme.warning, fontFamily: "Outfit_500Medium" }]}>
            {report.disclaimer}
          </Text>
          <View style={styles.row}>
            <View style={[styles.metricBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>Masse grasse</Text>
              <Text style={[styles.metricValue, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
                {report.metrics?.bodyFatPercent ?? "-"}%
              </Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>Posture</Text>
              <Text style={[styles.metricValue, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
                {report.posture?.score ?? "-"}
              </Text>
            </View>
          </View>

          <Text style={[styles.blockTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Type morphologique</Text>
          <ScoreBar label="Ectomorphe" value={report.morphotype?.ectomorphe || 0} color="#4CAF7D" theme={theme} />
          <ScoreBar label="Mesomorphe" value={report.morphotype?.mesomorphe || 0} color="#FFB547" theme={theme} />
          <ScoreBar label="Endomorphe" value={report.morphotype?.endomorphe || 0} color="#FF6B2C" theme={theme} />

          <Text style={[styles.blockTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Developpement musculaire</Text>
          {Object.entries(report.muscleScores || {}).map(([k, v]: any) => (
            <ScoreBar key={k} label={k} value={v} color="#6C63FF" theme={theme} />
          ))}

          <Text style={[styles.blockTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Conseils personnalises</Text>
          {(report.recommendations?.conseilsPersonnalises || []).map((tip: string, idx: number) => (
            <Text key={idx} style={[styles.bullet, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
              • {tip}
            </Text>
          ))}

          <Text style={[styles.blockTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Exercices cibles</Text>
          {(report.recommendations?.exercicesCibles || []).map((tip: string, idx: number) => (
            <Text key={idx} style={[styles.bullet, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
              • {tip}
            </Text>
          ))}

          <Text style={[styles.blockTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Plan alimentaire recommande</Text>
          <Text style={[styles.bullet, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
            Calories cible: {report.nutrition?.caloriesCible ?? "-"} kcal
          </Text>
          <Text style={[styles.bullet, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
            Proteines: {report.nutrition?.macros?.proteinesG ?? "-"}g · Glucides: {report.nutrition?.macros?.glucidesG ?? "-"}g · Lipides: {report.nutrition?.macros?.lipidesG ?? "-"}g
          </Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Historique des analyses</Text>
        {history.length === 0 ? (
          <Text style={[styles.smallLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
            Aucune analyse pour le moment.
          </Text>
        ) : (
          history.map((entry: any) => (
            <View key={entry.id} style={[styles.historyItem, { borderColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.historyDate, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                  {new Date(entry.createdAt).toLocaleDateString()}
                </Text>
                <Text style={[styles.historyMetric, { color: theme.accent, fontFamily: "Outfit_700Bold" }]}>
                  MG {entry.summary?.bodyFatPercent ?? "-"}%
                </Text>
              </View>
              <Text style={[styles.historySub, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                Posture {entry.summary?.postureScore ?? "-"} · Fort: {(entry.summary?.strongAreas || []).join(", ") || "-"}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 30 },
  subtitle: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  photosRow: { paddingHorizontal: 16, flexDirection: "row", gap: 8, marginBottom: 12 },
  photoSlot: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    height: 124,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoPreview: { width: "100%", height: "100%" },
  photoLabel: { marginTop: 4, fontSize: 12 },
  primaryBtn: {
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  primaryText: { color: "#fff", fontSize: 15 },
  card: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, marginBottom: 10 },
  disclaimer: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  row: { flexDirection: "row", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metricBox: { flex: 1, borderRadius: 10, padding: 10, marginBottom: 10 },
  metricLabel: { fontSize: 12, marginBottom: 4 },
  metricValue: { fontSize: 24 },
  progressTrack: { height: 8, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  smallLabel: { fontSize: 12 },
  smallValue: { fontSize: 12 },
  blockTitle: { marginTop: 8, marginBottom: 8, fontSize: 15 },
  bullet: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  historyItem: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  historyDate: { fontSize: 14 },
  historyMetric: { fontSize: 13 },
  historySub: { fontSize: 12, marginTop: 3 },
  guestWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  guestTitle: { fontSize: 22, marginTop: 12 },
  guestText: { marginTop: 8, textAlign: "center", fontSize: 14, lineHeight: 20 },
  guestBtn: { marginTop: 14, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  guestBtnText: { color: "#fff", fontSize: 14 },
});
