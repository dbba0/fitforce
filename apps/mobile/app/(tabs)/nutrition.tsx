import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks";
import { apiRequest } from "@/lib/query-client";
import { Typography } from "@/constants/typography";

const ACCENT = "#FF5500";
const SURFACE = "#1A1A1A";
const BG = "#111111";

// ─── Types ───────────────────────────────────────────────────────────────────

type FoodItem = {
  id?: string;
  fdcId?: string | number;
  slug?: string;
  shortName?: string;
  displayName?: string;
  name?: string;
  brand?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingDescription?: string;
  servingSize?: number;
  servingUnit?: string;
};

type Meal = {
  name?: string;
  label?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  foods?: FoodItem[];
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
};

type MealPlan = {
  meals?: Meal[];
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function extractFoods(payload: any): FoodItem[] {
  return payload?.foods ?? payload?.data ?? payload?.items ?? (Array.isArray(payload) ? payload : []);
}

function foodName(food: FoodItem): string {
  return food.shortName ?? food.displayName ?? food.name ?? "Aliment";
}

function foodId(food: FoodItem): string {
  return String(food.id ?? food.fdcId ?? food.slug ?? "");
}

function fmt(n?: number, unit = ""): string {
  if (n == null || isNaN(n)) return "--";
  return `${Math.round(n)}${unit}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MacroRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
    </View>
  );
}

function MealCard({ meal }: { meal: Meal }) {
  const label = meal.name ?? meal.label ?? "Repas";
  const cal = meal.calories ?? meal.nutrition?.calories;
  const prot = meal.protein ?? meal.nutrition?.protein;
  const carbs = meal.carbs ?? meal.nutrition?.carbs;
  const fat = meal.fat ?? meal.nutrition?.fat;
  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealName}>{label}</Text>
        <Text style={styles.mealCal}>{fmt(cal)} kcal</Text>
      </View>
      <View style={styles.mealMacros}>
        <MacroRow label="Protéines" value={`${fmt(prot)}g`} color="#4CAF50" />
        <MacroRow label="Glucides" value={`${fmt(carbs)}g`} color="#2196F3" />
        <MacroRow label="Lipides" value={`${fmt(fat)}g`} color="#FF9800" />
      </View>
      {meal.foods && meal.foods.length > 0 && (
        <View style={styles.mealFoods}>
          {meal.foods.slice(0, 3).map((food, i) => (
            <Text key={i} style={styles.mealFoodItem}>· {foodName(food)}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function FoodDetailModal({
  food,
  onClose,
}: {
  food: FoodItem | null;
  onClose: () => void;
}) {
  if (!food) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{foodName(food)}</Text>
          {food.brand ? (
            <Text style={styles.modalBrand}>{food.brand}</Text>
          ) : null}
          {food.servingDescription || food.servingSize ? (
            <Text style={styles.modalServing}>
              {food.servingDescription ?? `${food.servingSize ?? ""} ${food.servingUnit ?? "g"}`}
            </Text>
          ) : null}

          <View style={styles.modalMacroTable}>
            <View style={styles.modalMacroItem}>
              <Text style={[styles.modalMacroVal, { color: ACCENT }]}>{fmt(food.calories)}</Text>
              <Text style={styles.modalMacroKey}>kcal</Text>
            </View>
            <View style={styles.modalMacroItem}>
              <Text style={[styles.modalMacroVal, { color: "#4CAF50" }]}>{fmt(food.protein)}g</Text>
              <Text style={styles.modalMacroKey}>Protéines</Text>
            </View>
            <View style={styles.modalMacroItem}>
              <Text style={[styles.modalMacroVal, { color: "#2196F3" }]}>{fmt(food.carbs)}g</Text>
              <Text style={styles.modalMacroKey}>Glucides</Text>
            </View>
            <View style={styles.modalMacroItem}>
              <Text style={[styles.modalMacroVal, { color: "#FF9800" }]}>{fmt(food.fat)}g</Text>
              <Text style={styles.modalMacroKey}>Lipides</Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              console.log("[Nutrition] Ajouter au journal:", foodName(food), food);
              onClose();
            }}
            style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.addButtonText}>Ajouter au journal</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.closeLink}>
            <Text style={styles.closeLinkText}>Fermer</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const { colors, layout } = useAppTheme();
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === "web" ? 67 : 0;

  // Meal plan
  const [calories, setCalories] = useState("2000");
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const generatePlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const kcal = Math.max(800, Math.min(6000, Number(calories) || 2000));
      const res = await apiRequest("GET", `/api/nutrition-ymove/mealplan/generate?calories=${kcal}&diet=balanced`);
      const data = await res.json();
      setMealPlan(data?.mealPlan ?? data?.data ?? data);
    } catch {
      setPlanError("Impossible de générer le plan. Réessaie.");
    } finally {
      setPlanLoading(false);
    }
  };

  const searchFoods = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const res = await apiRequest("GET", `/api/nutrition-ymove/foods/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(extractFoods(data));
      } catch {
        setSearchError("Erreur de recherche.");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  }, []);

  useEffect(() => {
    searchFoods(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchFoods]);

  const openFoodDetail = async (food: FoodItem) => {
    const id = foodId(food);
    if (!id) {
      setSelectedFood(food);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await apiRequest("GET", `/api/nutrition-ymove/foods/${id}`);
      const data = await res.json();
      setSelectedFood(data?.food ?? data?.data ?? data);
    } catch {
      setSelectedFood(food); // fallback to list data
    } finally {
      setDetailLoading(false);
    }
  };

  const paddingH = Math.max(layout.screenPadding, 16);
  const paddingTop = (Platform.OS === "web" ? webTop : insets.top) + 16;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop,
          paddingHorizontal: paddingH,
          paddingBottom: insets.bottom + 110,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.headerWrap}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Typography.titleStrong }]}>
            Nutrition
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted, fontFamily: Typography.bodyRegular }]}>
            Propulsé par yMove
          </Text>
        </View>

        {/* ── Objectif calorique ── */}
        <View style={[styles.section, { backgroundColor: SURFACE }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: Typography.bodySemiBold }]}>
            Mon objectif calorique
          </Text>

          <View style={styles.calorieRow}>
            <TextInput
              value={calories}
              onChangeText={(v) => setCalories(v.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={[styles.calorieInput, { color: colors.text, borderColor: colors.border, fontFamily: Typography.title }]}
              placeholderTextColor={colors.textMuted}
              maxLength={5}
            />
            <Text style={[styles.calorieUnit, { color: colors.textMuted, fontFamily: Typography.bodyRegular }]}>
              kcal / jour
            </Text>
          </View>

          <Pressable
            onPress={generatePlan}
            disabled={planLoading}
            style={({ pressed }) => [styles.generateBtn, { opacity: pressed || planLoading ? 0.8 : 1 }]}
          >
            {planLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={[styles.generateBtnText, { fontFamily: Typography.bodySemiBold }]}>
                Générer mon plan
              </Text>
            )}
          </Pressable>

          {planError ? (
            <Text style={[styles.errorText, { color: "#FF4444" }]}>{planError}</Text>
          ) : null}
        </View>

        {/* ── Plan du jour ── */}
        {mealPlan ? (
          <View>
            <Text style={[styles.sectionHeader, { color: colors.text, fontFamily: Typography.titleStrong }]}>
              Plan du jour
            </Text>

            {(mealPlan.meals ?? []).map((meal, i) => (
              <MealCard key={i} meal={meal} />
            ))}

            {/* Total */}
            {(() => {
              const meals = mealPlan.meals ?? [];
              const totalCalories = mealPlan.totalCalories
                ?? meals.reduce((s, m) => s + (m.calories ?? m.nutrition?.calories ?? 0), 0);
              const totalProtein = mealPlan.totalProtein
                ?? meals.reduce((s, m) => s + (m.protein ?? m.nutrition?.protein ?? 0), 0);
              const totalCarbs = mealPlan.totalCarbs
                ?? meals.reduce((s, m) => s + (m.carbs ?? m.nutrition?.carbs ?? 0), 0);
              const totalFat = mealPlan.totalFat
                ?? meals.reduce((s, m) => s + (m.fat ?? m.nutrition?.fat ?? 0), 0);
              return (
                <View style={[styles.totalCard, { backgroundColor: SURFACE }]}>
                  <Text style={[styles.totalTitle, { color: colors.text, fontFamily: Typography.bodySemiBold }]}>
                    Total journalier
                  </Text>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalVal, { color: ACCENT }]}>{fmt(totalCalories)} kcal</Text>
                    <Text style={[styles.totalMacro, { color: "#4CAF50" }]}>P: {fmt(totalProtein)}g</Text>
                    <Text style={[styles.totalMacro, { color: "#2196F3" }]}>G: {fmt(totalCarbs)}g</Text>
                    <Text style={[styles.totalMacro, { color: "#FF9800" }]}>L: {fmt(totalFat)}g</Text>
                  </View>
                </View>
              );
            })()}
          </View>
        ) : null}

        {/* ── Recherche aliment ── */}
        <View>
          <Text style={[styles.sectionHeader, { color: colors.text, fontFamily: Typography.titleStrong }]}>
            Rechercher un aliment
          </Text>

          <View style={[styles.searchBox, { backgroundColor: SURFACE, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Poulet, riz, banane…"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text, fontFamily: Typography.bodyRegular }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchLoading ? <ActivityIndicator size="small" color={ACCENT} /> : null}
          </View>

          {searchError ? (
            <Text style={[styles.errorText, { color: "#FF4444" }]}>{searchError}</Text>
          ) : null}

          {searchResults.length > 0 ? (
            <View style={[styles.resultsList, { backgroundColor: SURFACE }]}>
              {searchResults.slice(0, 10).map((food, i) => (
                <Pressable
                  key={foodId(food) || String(i)}
                  onPress={() => openFoodDetail(food)}
                  style={({ pressed }) => [
                    styles.resultRow,
                    { opacity: pressed ? 0.85 : 1 },
                    i < searchResults.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } : {},
                  ]}
                >
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: colors.text, fontFamily: Typography.bodyRegular }]} numberOfLines={1}>
                      {foodName(food)}
                    </Text>
                    {food.brand ? (
                      <Text style={[styles.resultBrand, { color: colors.textMuted, fontFamily: Typography.bodyRegular }]}>
                        {food.brand}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.resultStats}>
                    <Text style={[styles.resultCal, { color: ACCENT, fontFamily: Typography.bodySemiBold }]}>
                      {fmt(food.calories)} kcal
                    </Text>
                    {food.protein != null ? (
                      <Text style={[styles.resultProt, { color: "#4CAF50", fontFamily: Typography.bodyRegular }]}>
                        {fmt(food.protein)}g prot.
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : query.trim() && !searchLoading ? (
            <Text style={[styles.emptySearch, { color: colors.textMuted, fontFamily: Typography.bodyRegular }]}>
              Aucun résultat pour « {query} »
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Loading overlay for food detail ── */}
      {detailLoading ? (
        <View style={styles.detailOverlay}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      ) : null}

      <FoodDetailModal food={selectedFood} onClose={() => setSelectedFood(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerWrap: { gap: 4 },
  headerTitle: { fontSize: 42, lineHeight: 48, letterSpacing: -1 },
  headerSub: { fontSize: 13 },

  section: { borderRadius: 16, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16 },
  sectionHeader: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, marginBottom: 12 },

  calorieRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  calorieInput: {
    fontSize: 32,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 120,
    textAlign: "center",
  },
  calorieUnit: { fontSize: 14, flex: 1 },

  generateBtn: {
    backgroundColor: ACCENT,
    borderRadius: 30,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  generateBtnText: { color: "#FFF", fontSize: 15 },

  errorText: { fontSize: 13, marginTop: 4 },

  mealCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mealName: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  mealCal: { color: ACCENT, fontSize: 14, fontWeight: "700" },
  mealMacros: { gap: 4 },
  macroRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { color: "#888", fontSize: 12, flex: 1 },
  macroValue: { fontSize: 12, fontWeight: "600" },
  mealFoods: { marginTop: 4, gap: 2 },
  mealFoodItem: { color: "#666", fontSize: 12 },

  totalCard: { borderRadius: 14, padding: 14, gap: 8 },
  totalTitle: { fontSize: 14 },
  totalRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  totalVal: { fontSize: 20, fontWeight: "700" },
  totalMacro: { fontSize: 13, fontWeight: "600" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  resultsList: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  resultInfo: { flex: 1, gap: 2 },
  resultName: { fontSize: 14 },
  resultBrand: { fontSize: 11 },
  resultStats: { alignItems: "flex-end", gap: 2 },
  resultCal: { fontSize: 13 },
  resultProt: { fontSize: 11 },

  emptySearch: { textAlign: "center", marginTop: 16, fontSize: 14 },

  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#444",
    marginBottom: 8,
  },
  modalTitle: { color: "#FFF", fontSize: 22, fontWeight: "700", lineHeight: 28 },
  modalBrand: { color: "#888", fontSize: 13 },
  modalServing: { color: "#666", fontSize: 12 },
  modalMacroTable: { flexDirection: "row", justifyContent: "space-around", marginVertical: 8 },
  modalMacroItem: { alignItems: "center", gap: 4 },
  modalMacroVal: { fontSize: 24, fontWeight: "700" },
  modalMacroKey: { color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  addButton: {
    backgroundColor: ACCENT,
    borderRadius: 30,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  addButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  closeLink: { alignItems: "center", paddingVertical: 8 },
  closeLinkText: { color: "#888", fontSize: 14 },
});
