// utils/constants.ts
import Constants from 'expo-constants';

export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://arweb-tau.vercel.app';

export const FIREBASE_CONFIG = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
};

export const SCAN_TIMEOUT = 5000;
export const RETRY_DELAY = 2000;
export const MAX_RETRIES = 3;

export const COLORS = {
  primary: '#f97316',
  primaryLight: '#fb923c',
  primaryDark: '#ea580c',
  secondary: '#06b6d4',
  accent: '#8b5cf6',
  background: '#0a0a0a',
  backgroundGradient: '#1a0a00',
  cardBackground: '#1f2937',
  border: '#374151',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

export const SAMPLE_AR_SESSIONS = [
  { id: '1', name: '3D Object Scan', duration: '2h 15m', type: 'Object', icon: '📦' },
  { id: '2', name: 'Environment Map', duration: '45m', type: 'Mapping', icon: '🗺️' },
  { id: '3', name: 'Face Tracking', duration: '1h 30m', type: 'Tracking', icon: '👤' },
  { id: '4', name: 'AR Markers', duration: '3h 20m', type: 'Markers', icon: '🎯' },
];