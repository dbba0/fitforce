import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { WorkoutSession } from "@/contexts/WorkoutContext";

export interface RetentionNotificationTexts {
  behavioralTitle: string;
  behavioralBody: string;
  streakDangerTitle: string;
  streakDangerBody: string;
  socialTitle: string;
  socialBody: string;
}

const BEHAVIORAL_ID_KEY = "@fitforce_notif_behavioral_id";
const BEHAVIORAL_TIME_KEY = "@fitforce_notif_behavioral_time";
const STREAK_ID_KEY = "@fitforce_notif_streak_id";
const SOCIAL_ID_KEY = "@fitforce_notif_social_id";
const CHANNEL_ID = "fitforce-retention";

let channelReady = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

function getMinutesOfDay(dateIso: string): number {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return 20 * 60;
  return date.getHours() * 60 + date.getMinutes();
}

function getCompletedSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions
    .filter((session) => session.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function hasCompletedSessionToday(sessions: WorkoutSession[]): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return sessions.some((session) => {
    if (!session.completed) return false;
    const date = new Date(session.date);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === now.getTime();
  });
}

async function ensureNotificationPrerequisites(): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();
  let granted = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) {
    const request = await Notifications.requestPermissionsAsync();
    granted = request.granted || request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  if (!granted) return false;

  if (Platform.OS === "android" && !channelReady) {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Rétention FitForce",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: "#F55F2B",
    });
    channelReady = true;
  }

  return true;
}

async function cancelIfExists(idKey: string) {
  const existingId = await AsyncStorage.getItem(idKey);
  if (!existingId) return;
  await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  await AsyncStorage.removeItem(idKey);
}

async function scheduleBehavioralReminder(
  sessions: WorkoutSession[],
  texts: RetentionNotificationTexts
) {
  const completed = getCompletedSessions(sessions).slice(0, 5);
  if (completed.length === 0) {
    await cancelIfExists(BEHAVIORAL_ID_KEY);
    await AsyncStorage.removeItem(BEHAVIORAL_TIME_KEY);
    return;
  }

  const avgMinutes = Math.round(
    completed.reduce((sum, session) => sum + getMinutesOfDay(session.date), 0) / completed.length
  );
  const hour = Math.floor(avgMinutes / 60) % 24;
  const minute = avgMinutes % 60;
  const targetSignature = `${hour}:${minute}`;

  const [previousId, previousSignature] = await Promise.all([
    AsyncStorage.getItem(BEHAVIORAL_ID_KEY),
    AsyncStorage.getItem(BEHAVIORAL_TIME_KEY),
  ]);

  if (previousId && previousSignature === targetSignature) return;
  if (previousId) {
    await Notifications.cancelScheduledNotificationAsync(previousId).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: texts.behavioralTitle,
      body: texts.behavioralBody,
      sound: "default",
    },
    trigger: {
      hour,
      minute,
      repeats: true,
      channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
    } as Notifications.CalendarTriggerInput,
  });

  await Promise.all([
    AsyncStorage.setItem(BEHAVIORAL_ID_KEY, id),
    AsyncStorage.setItem(BEHAVIORAL_TIME_KEY, targetSignature),
  ]);
}

async function scheduleStreakDangerReminder(
  sessions: WorkoutSession[],
  streakDays: number,
  texts: RetentionNotificationTexts
) {
  const hasTodayWorkout = hasCompletedSessionToday(sessions);
  if (hasTodayWorkout) {
    await cancelIfExists(STREAK_ID_KEY);
    return;
  }

  const previousId = await AsyncStorage.getItem(STREAK_ID_KEY);
  if (previousId) {
    await Notifications.cancelScheduledNotificationAsync(previousId).catch(() => {});
  }

  const targetDate = new Date();
  targetDate.setHours(20, 0, 0, 0);
  if (targetDate.getTime() <= Date.now()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: texts.streakDangerTitle,
      body: formatTemplate(texts.streakDangerBody, {
        streak: Math.max(0, streakDays),
      }),
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: targetDate,
      channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
    } as Notifications.DateTriggerInput,
  });

  await AsyncStorage.setItem(STREAK_ID_KEY, id);
}

async function scheduleSocialPlaceholder(texts: RetentionNotificationTexts) {
  const existingId = await AsyncStorage.getItem(SOCIAL_ID_KEY);
  if (existingId) return;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: texts.socialTitle,
      body: texts.socialBody,
      sound: "default",
    },
    trigger: {
      hour: 18,
      minute: 30,
      repeats: true,
      channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
    } as Notifications.CalendarTriggerInput,
  });

  await AsyncStorage.setItem(SOCIAL_ID_KEY, id);
}

export async function syncRetentionNotifications(params: {
  sessions: WorkoutSession[];
  streakDays: number;
  texts: RetentionNotificationTexts;
}) {
  const ready = await ensureNotificationPrerequisites();
  if (!ready) return;

  await scheduleBehavioralReminder(params.sessions, params.texts);
  await scheduleStreakDangerReminder(params.sessions, params.streakDays, params.texts);
  await scheduleSocialPlaceholder(params.texts);
}
