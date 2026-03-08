import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const TOKEN_KEY = "@fitforce_token";

let cachedToken: string | null = null;
const REQUEST_TIMEOUT_MS = 20000;
const NETWORK_ERROR_REGEX =
  /fetch failed|network request failed|request timeout|abort|cancel|failed to fetch/i;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function getCurrentWebHost(): string | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  return window.location.hostname || null;
}

function getApiBaseCandidates(): string[] {
  const explicitBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  const webHost = getCurrentWebHost();
  if (explicitBase) {
    const bases = [normalizeBaseUrl(explicitBase)];
    if (webHost && webHost !== "localhost" && webHost !== "127.0.0.1") {
      bases.push(normalizeBaseUrl(`http://${webHost}:4000`));
    }
    bases.push("http://127.0.0.1:4000/");
    bases.push("http://localhost:4000/");
    return [...new Set(bases)];
  }

  const candidates: string[] = [];
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    candidates.push(normalizeBaseUrl(`https://${domain}`));
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const expoHost = hostUri.split(":")[0];
    candidates.push(`http://${expoHost}:4000/`);
  }
  if (webHost && webHost !== "localhost" && webHost !== "127.0.0.1") {
    candidates.push(normalizeBaseUrl(`http://${webHost}:4000`));
  }

  candidates.push("http://127.0.0.1:4000/");
  candidates.push("http://localhost:4000/");

  return [...new Set(candidates)];
}

function isNetworkLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return NETWORK_ERROR_REGEX.test(error.message);
}

async function fetchFromApi(
  route: string,
  init: RequestInit = {},
  options?: { timeoutMs?: number },
): Promise<Response> {
  const bases = getApiBaseCandidates();
  let lastError: unknown;
  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const triedUrls: string[] = [];

  for (const baseUrl of bases) {
    try {
      const url = new URL(route, baseUrl);
      triedUrls.push(url.toString());
      return await fetchWithTimeout(url.toString(), init, timeoutMs);
    } catch (error) {
      lastError = error;
      if (!isNetworkLikeError(error)) {
        throw error;
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unable to reach API from current network";
  throw new Error(`${message}\nTried: ${triedUrls.join(" | ")}`);
}

export async function setAuthToken(token: string | null) {
  cachedToken = token;
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export function getApiUrl(): string {
  return getApiBaseCandidates()[0];
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
  options?: { timeoutMs?: number },
): Promise<Response> {
  const authHeaders = await getAuthHeaders();

  const res = await fetchFromApi(route, {
    method,
    headers: {
      ...authHeaders,
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  }, options);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();

    const res = await fetchFromApi(queryKey.join("/") as string, {
      headers: authHeaders,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
