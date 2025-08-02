// types/index.ts

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface ARSession {
  id: string;
  name: string;
  duration: string;
  type: string;
  icon: string;
}

export interface MarkerData {
  imageUrl: string;
  videoUrl: string;
  patternUrl?: string;
}

export interface ARState {
  showCamera: boolean;
  showImageScanner: boolean;
  isPreparing: boolean;
  isScanning: boolean;
  hasScanned: boolean;
  markerData: MarkerData | null;
  markerId: string | null;
  webViewError: string | null;
}

// ✅ Add these based on expected API responses

export interface LoginResponse {
  token: string;
  user: User;
}

export interface SignupResponse {
  message: string;
  user: User;
  token?: string; // if your backend returns token on signup
}


// ✅ Add WebViewMessage interface for AR component
export interface WebViewMessage {
  type: 'markerFound' | 'markerLost' | 'videoAutoPlayFailed' | 'videoError' | 'initializationError' | 'globalError' | 'videoLoaded'  | 'debug' | 'cameraPermissionDenied' | 'cameraPermissionNeeded' |'videoPlayError';
  message?: string;
  error?: string;
}


