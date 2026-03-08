import Constants from 'expo-constants';

function resolveApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  const hostUri = Constants.expoConfig?.hostUri;
  // In tunnel mode hostUri can be *.exp.direct and the phone cannot reach local API.
  if (!hostUri || hostUri.includes('exp.direct')) return 'http://localhost:4000/api';

  const host = hostUri.split(':')[0];
  return `http://${host}:4000/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();
