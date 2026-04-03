import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslationKey } from "@/lib/i18n";
import { apiRequest } from "@/lib/query-client";
import { useAppTheme } from "@/hooks";
import { BottomSheet, GhostButton, PillTabs, PrimaryButton } from "@/components/ui";
import { Typography } from "@/constants/typography";

type TrackingState = "idle" | "tracking" | "saving" | "done";
type ActivityType = "run" | "ride" | "walk";

type TrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

const EARTH_RADIUS_METERS = 6371000;
const HOLD_TO_FINISH_MS = 500;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = lat2 - lat1;
  const dLng = toRadians(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return EARTH_RADIUS_METERS * c;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDistance(distanceMeters: number): string {
  const safe = Math.max(0, distanceMeters);
  if (safe < 1000) return `${Math.round(safe)} m`;
  return `${(safe / 1000).toFixed(2)} km`;
}

function formatPace(minPerKm: number | null): string {
  if (!minPerKm || !Number.isFinite(minPerKm) || minPerKm <= 0) return "--:--";
  const minutes = Math.floor(minPerKm);
  const secondsRaw = Math.round((minPerKm - minutes) * 60);
  const seconds = secondsRaw === 60 ? 0 : secondsRaw;
  const adjustedMinutes = secondsRaw === 60 ? minutes + 1 : minutes;
  return `${String(adjustedMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

function getTimeLabel(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TrackScreen() {
  const { t } = useLanguage();
  const { colors, layout } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);
  const [isHoldingFinish, setIsHoldingFinish] = useState(false);

  const trackingStateRef = useRef<TrackingState>("idle");
  const mapRef = useRef<MapView>(null);
  const elapsedRef = useRef(0);
  const distanceRef = useRef(0);
  const pointsRef = useRef<TrackPoint[]>([]);
  const startedAtRef = useRef<Date | null>(null);
  const finishedAtRef = useRef<Date | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const holdAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    trackingStateRef.current = trackingState;
  }, [trackingState]);

  const clearElapsedTimer = useCallback(() => {
    if (!elapsedTimerRef.current) return;
    clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
  }, []);

  const stopLocationWatcher = useCallback(() => {
    watcherRef.current?.remove();
    watcherRef.current = null;
  }, []);

  const resetHoldAnimation = useCallback(() => {
    holdAnim.stopAnimation();
    holdAnim.setValue(0);
    setIsHoldingFinish(false);
  }, [holdAnim]);

  useEffect(() => {
    return () => {
      clearElapsedTimer();
      stopLocationWatcher();
      resetHoldAnimation();
    };
  }, [clearElapsedTimer, resetHoldAnimation, stopLocationWatcher]);

  const isTracking = trackingState === "tracking";

  useEffect(() => {
    if (isTracking) {
      const pulseLoop = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      pulseAnim.setValue(0);
      pulseLoop.start();
      return () => {
        pulseLoop.stop();
      };
    }

    pulseAnim.stopAnimation();
    pulseAnim.setValue(0);
    return undefined;
  }, [isTracking, pulseAnim]);

  const appendPoint = useCallback((nextPoint: TrackPoint) => {
    const last = pointsRef.current[pointsRef.current.length - 1];
    const delta = last ? haversineMeters(last, nextPoint) : 0;
    const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    distanceRef.current += safeDelta;
    pointsRef.current = [...pointsRef.current, nextPoint];

    setDistanceMeters(distanceRef.current);
    setPoints(pointsRef.current);
  }, []);

  const zoomToUser = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      mapRef.current?.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        },
        1200
      );
    } catch {
      // Ignore l'échec du zoom initial (permission ou position indisponible)
    }
  }, []);

  useEffect(() => {
    void zoomToUser();
  }, [zoomToUser]);

  const startTracking = useCallback(async () => {
    if (trackingStateRef.current === "tracking" || trackingStateRef.current === "saving") return;

    setErrorKey(null);
    resetHoldAnimation();

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setErrorKey("trackPermissionDenied");
        return;
      }
    } catch (error) {
      console.error("[Track] Permission localisation refusée", error);
      setErrorKey("trackPermissionDenied");
      return;
    }

    await zoomToUser();

    clearElapsedTimer();
    stopLocationWatcher();

    const now = new Date();
    setTrackingState("tracking");
    setShowSaveModal(false);
    setStartedAt(now);
    setFinishedAt(null);
    setElapsedSeconds(0);
    setDistanceMeters(0);
    setPoints([]);

    startedAtRef.current = now;
    finishedAtRef.current = null;
    elapsedRef.current = 0;
    distanceRef.current = 0;
    pointsRef.current = [];

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const first = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      appendPoint({
        latitude: first.coords.latitude,
        longitude: first.coords.longitude,
        timestamp: first.timestamp ?? Date.now(),
      });
    } catch (error) {
      console.error("[Track] Première position indisponible", error);
      setErrorKey("trackLocationReadError");
    }

    elapsedTimerRef.current = setInterval(() => {
      if (trackingStateRef.current !== "tracking") return;
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
    }, 1000);

    try {
      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 3000,
          distanceInterval: 1,
        },
        (location) => {
          appendPoint({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp ?? Date.now(),
          });
          setErrorKey(null);
        }
      );
    } catch (error) {
      console.error("[Track] watchPositionAsync indisponible", error);
      setErrorKey("trackLocationReadError");
      clearElapsedTimer();
      setTrackingState("idle");
    }
  }, [appendPoint, clearElapsedTimer, resetHoldAnimation, stopLocationWatcher, zoomToUser]);

  const finishTracking = useCallback(() => {
    if (trackingStateRef.current !== "tracking") return;

    clearElapsedTimer();
    stopLocationWatcher();
    resetHoldAnimation();

    const end = new Date();
    finishedAtRef.current = end;
    setFinishedAt(end);
    setTrackingState("idle");
    setShowSaveModal(true);

    setActivityTitle((prev) => {
      if (prev.trim().length > 0) return prev;
      const day = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "2-digit" }).format(end);
      return `${t("trackDefaultTitle")} ${day}`;
    });
  }, [clearElapsedTimer, resetHoldAnimation, stopLocationWatcher, t]);

  const saveActivity = useCallback(async () => {
    const started = startedAtRef.current;
    const finished = finishedAtRef.current;
    if (!started || !finished) {
      setErrorKey("trackSaveError");
      return;
    }

    const title = activityTitle.trim();
    if (!title) {
      setErrorKey("trackTitleRequired");
      return;
    }

    setTrackingState("saving");
    setErrorKey(null);

    try {
      const durationSeconds = Math.max(0, Math.floor(elapsedRef.current));
      const safeDistance = Math.max(0, Math.round(distanceRef.current));
      const avgPaceSecPerKm =
        safeDistance > 0 ? Math.round(durationSeconds / Math.max(safeDistance / 1000, 0.001)) : 0;

      await apiRequest("POST", "/api/activities", {
        title,
        type: activityType,
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        durationSeconds,
        distanceMeters: safeDistance,
        calories: 0,
        avgPaceSecPerKm,
        route: pointsRef.current.map((point) => ({
          lat: point.latitude,
          lng: point.longitude,
          timestamp: new Date(point.timestamp).toISOString(),
        })),
      });

      setShowSaveModal(false);
      setTrackingState("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      console.error("[Track] Erreur sauvegarde activité", error);
      setTrackingState("idle");
      setErrorKey("trackSaveError");
    }
  }, [activityTitle, activityType]);

  const cancelSave = useCallback(() => {
    if (trackingStateRef.current === "saving") return;
    setShowSaveModal(false);
    setTrackingState("idle");
  }, []);

  const startHoldFinish = useCallback(() => {
    if (trackingStateRef.current !== "tracking") return;
    setIsHoldingFinish(true);
    holdAnim.setValue(0);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: HOLD_TO_FINISH_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [holdAnim]);

  const triggerFinishTracking = useCallback(() => {
    if (trackingStateRef.current !== "tracking") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    finishTracking();
  }, [finishTracking]);

  const paceMinPerKm = useMemo(() => {
    if (distanceMeters <= 0) return null;
    return (elapsedSeconds / 60) / (distanceMeters / 1000);
  }, [distanceMeters, elapsedSeconds]);

  const statusLabel = trackingState === "tracking" ? t("trackStatusTracking").toUpperCase() : t("trackStatusIdle").toUpperCase();
  const statusIsTracking = isTracking;
  const mapType = Platform.OS === "ios" ? "mutedStandard" : "standard";
  const tabBarClearance = Platform.OS === "web" ? 74 : 74 + Math.max(insets.bottom - 2, 0);
  const holdWidth = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 28 / 12],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const lastPoint = points[points.length - 1];

  const secondarySegments = useMemo(() => {
    const segments: string[] = [];
    segments.push(formatTemplate(t("trackPointsCount"), { count: points.length }));

    const startLabel = getTimeLabel(startedAt);
    if (startLabel) {
      segments.push(formatTemplate(t("trackStartedAt"), { time: startLabel }));
    }

    const endLabel = getTimeLabel(finishedAt);
    if (endLabel) {
      segments.push(formatTemplate(t("trackFinishedAt"), { time: endLabel }));
    }

    return segments;
  }, [finishedAt, points.length, startedAt, t]);

  const activityTypeTabs = useMemo(
    () => [
      { key: "run" as const, label: t("trackTypeRun") },
      { key: "ride" as const, label: t("trackTypeRide") },
      { key: "walk" as const, label: t("trackTypeWalk") },
    ],
    [t]
  );

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapType={mapType as any}
        showsUserLocation
        followsUserLocation={statusIsTracking}
        showsMyLocationButton={false}
        showsCompass
        showsScale
      >
        {points.length > 1 ? (
          <Polyline
            coordinates={points.map((point) => ({
              latitude: point.latitude,
              longitude: point.longitude,
            }))}
            strokeColor="#FF5500"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        {isTracking && lastPoint ? (
          <Marker
            coordinate={{
              latitude: lastPoint.latitude,
              longitude: lastPoint.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.liveMarkerWrap}>
              <Animated.View
                style={[
                  styles.liveMarkerPulse,
                  {
                    transform: [{ scale: pulseScale }],
                    opacity: pulseOpacity,
                  },
                ]}
              />
              <View style={styles.liveMarkerDot} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      <SafeAreaView edges={[]} style={[styles.overlayWrap, { bottom: tabBarClearance }]}>
        <View style={[styles.overlay, { paddingHorizontal: Math.max(layout.screenPadding, 16) }]}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusIsTracking ? "rgba(255,85,0,0.22)" : "rgba(120,120,120,0.28)",
                  borderColor: statusIsTracking ? "rgba(255,85,0,0.65)" : "rgba(150,150,150,0.42)",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: statusIsTracking ? "#FF5500" : "#B0B0B0",
                    fontFamily: Typography.labelTech,
                  },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.title, { color: "#FFFFFF", fontFamily: Typography.titleStrong }]}
            >
              {t("trackTitle")}
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontFamily: Typography.titleStrong }]}>
                {formatDuration(elapsedSeconds)}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: Typography.labelTech }]}>{`⏱ ${t("trackTimerLabel").toUpperCase()}`}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontFamily: Typography.titleStrong }]}>
                {formatDistance(distanceMeters)}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: Typography.labelTech }]}>{`📍 ${t("trackDistanceLabel").toUpperCase()}`}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontFamily: Typography.titleStrong }]}>
                {formatPace(paceMinPerKm)}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: Typography.labelTech }]}>{`⚡ ${t("trackPaceLabel").toUpperCase()}`}</Text>
            </View>
          </View>

          <Text style={[styles.secondaryLine, { fontFamily: Typography.bodyRegular }]}>
            {secondarySegments.join(" | ")}
          </Text>

          {errorKey ? (
            <Text style={[styles.errorText, { fontFamily: Typography.bodySemiBold }]}>
              {t(errorKey)}
            </Text>
          ) : null}

          {statusIsTracking ? (
            <Pressable
              delayLongPress={HOLD_TO_FINISH_MS}
              onPress={triggerFinishTracking}
              onPressIn={startHoldFinish}
              onPressOut={resetHoldAnimation}
              onLongPress={triggerFinishTracking}
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  backgroundColor: "#FF5500",
                  shadowColor: "#FF5500",
                  opacity: pressed ? 0.95 : 1,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.holdProgress,
                  {
                    width: holdWidth,
                    opacity: isHoldingFinish ? 1 : 0,
                  },
                ]}
              />
              <Text style={[styles.ctaLabel, { fontFamily: Typography.bodyBold }]}>{t("trackFinishButton")}</Text>
            </Pressable>
          ) : (
            <PrimaryButton
              label={trackingState === "saving" ? t("trackStatusSaving") : t("trackStartButton")}
              onPress={startTracking}
              disabled={trackingState === "saving"}
              loading={trackingState === "saving"}
              style={styles.primaryButton}
            />
          )}
        </View>
      </SafeAreaView>

      <BottomSheet visible={showSaveModal} onClose={cancelSave} title={t("trackSaveModalTitle")}>
        <View style={styles.sheetContent}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: Typography.bodySemiBold }]}>
            {t("trackActivityTitleLabel")}
          </Text>

          <View style={[styles.titleInputWrap, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
            <TextInput
              value={activityTitle}
              onChangeText={setActivityTitle}
              placeholder={t("trackActivityTitlePlaceholder")}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="sentences"
              returnKeyType="done"
              maxLength={80}
              style={[styles.titleInput, { color: colors.text, fontFamily: Typography.body }]}
            />
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary, fontFamily: Typography.bodySemiBold }]}>
            {t("trackActivityTypeLabel")}
          </Text>

          <PillTabs tabs={activityTypeTabs} active={activityType} onChange={setActivityType} />

          <PrimaryButton
            label={t("trackSaveButton")}
            onPress={() => {
              void saveActivity();
            }}
            loading={trackingState === "saving"}
            disabled={trackingState === "saving"}
            style={styles.saveButton}
          />
          <GhostButton label={t("trackCancelButton")} onPress={cancelSave} style={styles.cancelButton} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  overlayWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "rgba(17,17,17,0.85)",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    minHeight: 24,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statItem: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    color: "#FFFFFF",
    letterSpacing: -0.7,
  },
  statLabel: {
    fontSize: 10,
    lineHeight: 12,
    color: "#888888",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  secondaryLine: {
    fontSize: 12,
    lineHeight: 16,
    color: "#B0B0B0",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#FF8B8B",
  },
  ctaButton: {
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 7,
  },
  holdProgress: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  ctaLabel: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  primaryButton: {
    width: "100%",
  },
  sheetContent: {
    gap: 10,
    paddingBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  titleInputWrap: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
  },
  titleInput: {
    minHeight: 52,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  saveButton: {
    marginTop: 6,
  },
  cancelButton: {
    marginTop: 12,
  },
  liveMarkerWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  liveMarkerPulse: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF5500",
  },
  liveMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF5500",
  },
});
