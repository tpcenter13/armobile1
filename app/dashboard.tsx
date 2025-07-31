import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NetInfo from '@react-native-community/netinfo';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

// Firebase configuration
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface ARSession {
  id: string;
  name: string;
  duration: string;
  type: string;
  icon: string;
}

interface MarkerData {
  imageUrl: string;
  videoUrl: string;
  patternUrl?: string;
}

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://arweb-tau.vercel.app';

interface ARWorldButtonProps {
  onPress: () => void;
}

const ARWorldButton: React.FC<ARWorldButtonProps> = ({ onPress }) => {
  const [permission, requestPermission] = useCameraPermissions();

  const handleEnterARWorld = async () => {
    if (!permission) {
      console.log('Permissions still loading');
      return;
    }

    if (!permission.granted) {
      if (permission.canAskAgain) {
        const response = await requestPermission();
        if (response.granted) {
          onPress();
        } else {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access to start the AR experience.',
            [{ text: 'OK' }],
          );
        }
      } else {
        Alert.alert(
          'Camera Permission Denied',
          'Camera access is required. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
      return;
    }

    onPress();
  };

  if (!permission) {
    return (
      <View style={styles.cameraContainer}>
        <Text style={styles.backButtonText}>Checking camera permissions...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.arWorldButton} onPress={handleEnterARWorld}>
      <View style={styles.buttonGlow} />
      <Text style={styles.arWorldButtonText}>🥽 ENTER AR WORLD</Text>
      <Text style={styles.arWorldButtonSubtext}>Start New Session</Text>
    </TouchableOpacity>
  );
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [showImageScanner, setShowImageScanner] = useState(false);
  const [markerData, setMarkerData] = useState<MarkerData | null>(null);
  const [markerId, setMarkerId] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const lastScanRef = useRef<string | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);

  const [arSessions] = useState<ARSession[]>([
    { id: '1', name: '3D Object Scan', duration: '2h 15m', type: 'Object', icon: '📦' },
    { id: '2', name: 'Environment Map', duration: '45m', type: 'Mapping', icon: '🗺️' },
    { id: '3', name: 'Face Tracking', duration: '1h 30m', type: 'Tracking', icon: '👤' },
    { id: '4', name: 'AR Markers', duration: '3h 20m', type: 'Markers', icon: '🎯' },
  ]);

  useEffect(() => {
    fetchCurrentUser();
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Network state changed:', state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setLoading(false);
        return;
      }

      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/current-user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
      } else {
        Alert.alert('Error', 'Failed to load user profile');
      }
    } catch (error) {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (storageError) {
        console.error('Storage error:', storageError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Updated fetchMarkerData with API fallback
  const fetchMarkerData = async (markerId: string, retries = 3, delay = 2000) => {
    try {
      setIsPreparing(true);
      setWebViewError(null);
      console.log('Fetching marker data for:', markerId);

      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No internet connection');
      }

      // Check cache first
      const cachedData = await AsyncStorage.getItem(`marker_${markerId}`);
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          if (isValidMarkerData(data)) {
            console.log('Using valid cached marker data');
            setMarkerData(data);
            setMarkerId(markerId);
            setIsPreparing(false);
            setShowImageScanner(true);
            return;
          } else {
            console.log('Cached data is invalid, clearing cache');
            await AsyncStorage.removeItem(`marker_${markerId}`);
          }
        } catch (parseError) {
          console.log('Error parsing cached data, clearing cache');
          await AsyncStorage.removeItem(`marker_${markerId}`);
        }
      }

      // Try API first (since it's working)
      try {
        console.log('Fetching from API...');
        const response = await fetch(`${API_URL}/api/get-marker?markerId=${markerId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
         
        });

        if (response.ok) {
          const data = await response.json();
          console.log('API marker data:', data);

          if (isValidMarkerData(data)) {
            setMarkerData(data);
            setMarkerId(markerId);
            await AsyncStorage.setItem(`marker_${markerId}`, JSON.stringify(data));
            setIsPreparing(false);
            setShowImageScanner(true);
            return;
          } else {
            throw new Error('Invalid marker data structure from API');
          }
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      } catch (apiError) {
        console.log('API failed, trying Firebase...', apiError);
        
        // Fallback to Firebase
        try {
          const docRef = doc(db, 'markers', markerId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as MarkerData;
            console.log('Firebase marker data:', data);

            if (!isValidMarkerData(data)) {
              throw new Error('Invalid marker data structure from Firestore');
            }

            setMarkerData(data);
            setMarkerId(markerId);
            await AsyncStorage.setItem(`marker_${markerId}`, JSON.stringify(data));
            setIsPreparing(false);
            setShowImageScanner(true);
            return;
          } else {
            throw new Error('Marker not found in Firebase');
          }
        } catch (firebaseError) {
          console.error('Firebase also failed:', firebaseError);
          throw new Error('Both API and Firebase failed to fetch marker data');
        }
      }
    } catch (error: any) {
      console.error('Error fetching marker data:', error.message || error);
      
      if (retries > 0 && !error.message.includes('Invalid') && 
          error.message !== 'No internet connection' && 
          !error.message.includes('not found')) {
        console.log(`Retrying (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchMarkerData(markerId, retries - 1, delay * 1.5);
      }
      
      Alert.alert(
        'Error', 
        `Failed to load marker data: ${error.message || 'Check your connection and try again.'}`
      );
      resetARState();
    }
  };

  const isValidMarkerData = (data: any): data is MarkerData => {
    return (
      data &&
      typeof data.imageUrl === 'string' &&
      data.imageUrl.startsWith('http') &&
      typeof data.videoUrl === 'string' &&
      data.videoUrl.startsWith('http') &&
      (data.patternUrl === undefined || (typeof data.patternUrl === 'string' && data.patternUrl.startsWith('http')))
    );
  };

  const handleScan = (data: string) => {
    if (!isScanning || lastScanRef.current === data) {
      return;
    }

    console.log('QR Code scanned:', data);
    lastScanRef.current = data;
    setIsScanning(false);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(true);
      lastScanRef.current = null;
    }, 5000);

    try {
      const url = new URL(data);
      console.log('Parsed URL:', url.toString());

      if (url.hostname === 'arweb-tau.vercel.app' && url.pathname === '/ar') {
        const markerId = url.searchParams.get('markerId');
        console.log('Extracted markerId:', markerId);

        if (markerId) {
          clearMarkerCache(markerId).then(() => {
            fetchMarkerData(markerId);
          });
        } else {
          console.log('No markerId in URL');
          Alert.alert('Error', 'Invalid QR code: No markerId found');
          setTimeout(() => setIsScanning(true), 2000);
        }
      } else {
        console.log('URL does not match expected pattern');
        Alert.alert('Error', 'Invalid QR code: Wrong URL format');
        setTimeout(() => setIsScanning(true), 2000);
      }
    } catch (error) {
      console.error('Error parsing QR code:', error);
      Alert.alert('Error', 'Invalid QR code format');
      setTimeout(() => setIsScanning(true), 2000);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'AR Explorer';
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];
    return 'AR Explorer';
  };

  const getUserInitials = () => {
    if (!user) return '👤';
    if (user.firstName && user.lastName) return `${user.firstName.charAt(0).toUpperCase()}${user.lastName.charAt(0).toUpperCase()}`;
    if (user.firstName) return user.firstName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return '👤';
  };

  const renderARSession = (item: ARSession) => (
    <TouchableOpacity style={styles.sessionCard} key={item.id}>
      <View style={styles.sessionIcon}>
        <Text style={styles.sessionIconText}>{item.icon}</Text>
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionName}>{item.name}</Text>
        <Text style={styles.sessionType}>
          {item.type} • {item.duration}
        </Text>
      </View>
      <View style={styles.sessionAction}>
        <Text style={styles.sessionActionText}>▶</Text>
      </View>
    </TouchableOpacity>
  );

  const handleProfilePress = () => {
    if (!user) return;
    Alert.alert(
      'Profile Information',
      `Name: ${getUserDisplayName()}\nEmail: ${user.email}${user.phone ? `\nPhone: ${user.phone}` : ''}`,
      [{ text: 'OK' }],
    );
  };

  const resetARState = () => {
    setShowCamera(false);
    setShowImageScanner(false);
    setMarkerData(null);
    setMarkerId(null);
    setIsPreparing(false);
    setWebViewError(null);
    setIsScanning(true);
    lastScanRef.current = null;

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const clearMarkerCache = async (markerId: string) => {
    try {
      await AsyncStorage.removeItem(`marker_${markerId}`);
      console.log('Cache cleared for marker:', markerId);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  if (showCamera) {
    if (!permission?.granted) {
      return (
        <View style={styles.cameraContainer}>
          <Text style={styles.backButtonText}>
            {permission?.canAskAgain
              ? 'Camera permission is required. Please grant permission.'
              : 'Camera permission denied. Please enable it in settings.'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={async () => {
              if (permission?.canAskAgain) {
                await requestPermission();
              } else {
                Linking.openSettings();
              }
            }}
          >
            <Text style={styles.backButtonText}>
              {permission?.canAskAgain ? 'Request Permission' : 'Open Settings'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backButton, { bottom: 80 }]} onPress={resetARState}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isPreparing) {
      return (
        <View style={styles.cameraContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.instructions}>Preparing AR experience...</Text>
          <TouchableOpacity style={styles.backButton} onPress={resetARState}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (showImageScanner && markerData && markerId) {
      if (!markerData.patternUrl || !markerData.videoUrl) {
        setWebViewError('Missing or invalid marker data');
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load AR experience</Text>
            <Text style={styles.errorDetails}>{webViewError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setWebViewError(null);
                AsyncStorage.removeItem(`marker_${markerId}`);
                fetchMarkerData(markerId);
              }}
            >
              <Text style={styles.backButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.backButton, { bottom: 80 }]}
              onPress={async () => {
                await AsyncStorage.removeItem(`marker_${markerId}`);
                Alert.alert('Cache cleared', 'Please rescan the QR code.');
                resetARState();
              }}
            >
              <Text style={styles.backButtonText}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        );
      }

      // Fixed AR HTML - Using marker-based tracking instead of NFT
      const arHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <title>AR Experience</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/aframe/1.4.0/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.min.js"></script>
  <style>
    body { 
      margin: 0; 
      overflow: hidden; 
      font-family: Arial, sans-serif;
    }
    #loading {
      position: fixed;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      z-index: 9999;
      text-align: center;
    }
    .loading-spinner {
      border: 4px solid rgba(255,255,255,0.3);
      border-top: 4px solid #f97316;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    #arDebug {
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 1000;
      max-width: 200px;
    }
  </style>
</head>
<body>
  <div id="loading">
    <div class="loading-spinner"></div>
    <div>Loading AR Scene...</div>
    <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
      Initializing camera and AR tracking
    </div>
  </div>

  <div id="arDebug" style="display: none;">
    <div>Status: <span id="arStatus">Initializing...</span></div>
    <div>Marker: <span id="markerStatus">Not found</span></div>
    <div>Video: <span id="videoStatus">Loading...</span></div>
  </div>

  <a-scene
    vr-mode-ui="enabled: false"
    arjs="sourceType: webcam; 
          debugUIEnabled: false; 
          detectionMode: mono_and_matrix; 
          matrixCodeType: 3x3; 
          trackingMethod: best; 
          maxDetectionRate: 60; 
          canvasWidth: 640; 
          canvasHeight: 480;
          displayWidth: 640;
          displayHeight: 480;"
    embedded
    renderer="logarithmicDepthBuffer: true; 
             colorManagement: true; 
             sortObjects: true; 
             antialias: true; 
             alpha: true; 
             precision: mediump;
             powerPreference: default;"
    style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;"
    loading-screen="enabled: false"
  >
    <a-assets>
      <video
        id="ar-video"
        src="${markerData.videoUrl}"
        preload="auto"
        loop
        crossorigin="anonymous"
        webkit-playsinline="true"
        playsinline
        muted="true"
        autoplay="false"
        style="display: none;"
      ></video>
    </a-assets>

    <a-camera
      gps-camera
      rotation-reader
      arjs-look-controls="smoothingFactor: 0.1"
      camera="fov: 80; near: 0.01; far: 1000;"
    ></a-camera>

    <a-marker
      type="pattern"
      url="${markerData.patternUrl}"
      smooth="true"
      smoothCount="10"
      smoothTolerance="0.01"
      smoothThreshold="5"
      registerevents="true"
      id="pattern-marker"
      emitevents="true"
      cursor="rayOrigin: mouse"
    >
      <!-- Video plane -->
      <a-plane
        position="0 0 0.01"
        rotation="-90 0 0"
        width="2"
        height="1.5"
        material="src: #ar-video; 
                 transparent: true; 
                 alphaTest: 0.5; 
                 opacity: 1;
                 shader: flat;"
        animation__found="property: scale; 
                         to: 1.1 1.1 1.1; 
                         startEvents: markerFound; 
                         dur: 300;
                         easing: easeOutCubic"
        animation__lost="property: scale; 
                        to: 1 1 1; 
                        startEvents: markerLost; 
                        dur: 300;
                        easing: easeInCubic"
        id="video-plane"
      ></a-plane>
      
      <!-- Status text -->
      <a-text
        id="status-text"
        value="🎯 AR ACTIVE!"
        position="0 1.2 0"
        color="#00ff88"
        scale="0.5 0.5 0.5"
        align="center"
        font="kelsonsans"
        animation__pulse="property: scale; 
                         to: 0.6 0.6 0.6; 
                         dir: alternate; 
                         dur: 1000; 
                         loop: true;
                         easing: easeInOutSine"
      ></a-text>

      <!-- Border frame -->
      <a-box
        position="0 0 -0.01"
        width="2.1"
        height="1.6"
        depth="0.02"
        color="#f97316"
        opacity="0.3"
        material="transparent: true"
      ></a-box>
    </a-marker>
  </a-scene>

  <script>
    let isLoaded = false;
    let markerFound = false;
    let videoLoaded = false;
    let debugMode = false; // Set to true for debugging

    // Show debug info if enabled
    if (debugMode) {
      document.getElementById('arDebug').style.display = 'block';
    }

    function updateStatus(status) {
      if (debugMode) {
        document.getElementById('arStatus').textContent = status;
      }
      console.log('AR Status:', status);
    }

    function updateMarkerStatus(status) {
      if (debugMode) {
        document.getElementById('markerStatus').textContent = status;
      }
    }

    function updateVideoStatus(status) {
      if (debugMode) {
        document.getElementById('videoStatus').textContent = status;
      }
    }

    // Hide loading screen when everything is ready
    function hideLoading() {
      const loading = document.getElementById('loading');
      if (loading && isLoaded) {
        loading.style.opacity = '0';
        setTimeout(() => {
          loading.style.display = 'none';
        }, 300);
      }
    }

    // Scene loaded
    document.querySelector('a-scene').addEventListener('loaded', () => {
      console.log('A-Frame scene loaded');
      updateStatus('Scene loaded');
      isLoaded = true;
      hideLoading();
    });

    // AR system ready
    document.querySelector('a-scene').addEventListener('arjs-video-loaded', () => {
      console.log('AR.js video loaded');
      updateStatus('AR system ready');
    });

    // Marker events
    const marker = document.querySelector('#pattern-marker');
    if (marker) {
      marker.addEventListener('markerFound', () => {
        console.log('🎯 Pattern marker found!');
        markerFound = true;
        updateMarkerStatus('Found');
        
        const video = document.querySelector('#ar-video');
        if (video && video.paused) {
          video.currentTime = 0;
          video.play().then(() => {
            console.log('✅ Video started playing');
            updateVideoStatus('Playing');
            window.ReactNativeWebView?.postMessage(JSON.stringify({ 
              type: 'markerFound',
              message: 'Pattern marker detected and video started'
            }));
          }).catch((e) => {
            console.error('❌ Video play failed:', e);
            updateVideoStatus('Play failed');
            window.ReactNativeWebView?.postMessage(JSON.stringify({ 
              type: 'videoAutoPlayFailed', 
              error: e.message 
            }));
          });
        }
      });

      marker.addEventListener('markerLost', () => {
        console.log('❌ Pattern marker lost');
        markerFound = false;
        updateMarkerStatus('Lost');
        
        const video = document.querySelector('#ar-video');
        if (video && !video.paused) {
          video.pause();
          updateVideoStatus('Paused');
        }
        
        window.ReactNativeWebView?.postMessage(JSON.stringify({ 
          type: 'markerLost',
          message: 'Pattern marker lost'
        }));
      });
    }

    // Video events
    const video = document.querySelector('#ar-video');
    if (video) {
      video.addEventListener('loadstart', () => {
        console.log('Video loading started');
        updateVideoStatus('Loading...');
      });

      video.addEventListener('canplay', () => {
        console.log('✅ Video can play');
        videoLoaded = true;
        updateVideoStatus('Ready');
        window.ReactNativeWebView?.postMessage(JSON.stringify({ 
          type: 'videoLoaded',
          message: 'Video is ready to play'
        }));
      });

      video.addEventListener('error', (e) => {
        console.error('❌ Video error:', e);
        updateVideoStatus('Error');
        window.ReactNativeWebView?.postMessage(JSON.stringify({ 
          type: 'videoError', 
          error: e.message || 'Video failed to load'
        }));
      });

      video.addEventListener('play', () => {
        console.log('▶️ Video started playing');
        updateVideoStatus('Playing');
      });

      video.addEventListener('pause', () => {
        console.log('⏸️ Video paused');
        updateVideoStatus('Paused');
      });
    }

    // Error handling
    window.addEventListener('error', (e) => {
      console.error('❌ Global error:', e);
      window.ReactNativeWebView?.postMessage(JSON.stringify({ 
        type: 'globalError', 
        message: e.error?.message || e.message || 'Unknown error'
      }));
    });

    // AR.js error handling
    window.addEventListener('arjs-error', (e) => {
      console.error('❌ AR.js error:', e);
      window.ReactNativeWebView?.postMessage(JSON.stringify({ 
        type: 'initializationError', 
        message: e.detail?.message || 'AR initialization failed'
      }));
    });

    // Timeout for loading
    setTimeout(() => {
      if (!isLoaded) {
        console.warn('Scene taking too long to load');
        updateStatus('Loading timeout');
        hideLoading();
      }
    }, 10000);

    console.log('AR.js script initialized');
    updateStatus('Initializing...');
  </script>
</body>
</html>
`;

      return (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
          />
          {webViewError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load AR experience</Text>
              <Text style={styles.errorDetails}>{webViewError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setWebViewError(null);
                  AsyncStorage.removeItem(`marker_${markerId}`);
                  fetchMarkerData(markerId);
                }}
              >
                <Text style={styles.backButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.backButton, { bottom: 80 }]}
                onPress={async () => {
                  await AsyncStorage.removeItem(`marker_${markerId}`);
                  Alert.alert('Cache cleared', 'Please rescan the QR code.');
                  resetARState();
                }}
              >
                <Text style={styles.backButtonText}>Clear Cache</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              key={`webview-${markerId}`}
              style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}
              source={{ html: arHTML }}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              mixedContentMode="compatibility"
              allowsAccessToCamera={true}
              androidHardwareAccelerationDisabled={false}
              androidLayerType="hardware"
              cacheEnabled={false}
              incognito={true}
              onLoad={() => console.log('WebView loaded successfully')}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('WebView error:', nativeEvent);
                setWebViewError(`WebView Error: ${nativeEvent.description || 'Unknown error'}`);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('WebView HTTP error:', nativeEvent);
                setWebViewError(`HTTP Error: ${nativeEvent.statusCode} - ${nativeEvent.description}`);
              }}
              onMessage={(event) => {
                try {
                  const message = JSON.parse(event.nativeEvent.data);
                  console.log('📨 WebView message:', message);

                  switch (message.type) {
                    case 'markerFound':
                      console.log('🎯 Marker detected!', message.message);
                      break;
                    case 'markerLost':
                      console.log('❌ Marker lost:', message.message);
                      break;
                    case 'videoAutoPlayFailed':
                      console.log('❌ Video autoplay failed:', message.error);
                      Alert.alert(
                        '🎬 AR Video Ready',
                        'Video is loaded but requires user interaction. Tap anywhere on the screen to start.',
                        [{ text: 'OK' }]
                      );
                      break;
                    case 'videoError':
                      console.error('❌ Video error:', message);
                      setWebViewError(`Video Error: ${message.error}`);
                      break;
                    case 'initializationError':
                      console.error('❌ AR initialization error:', message);
                      setWebViewError(`Initialization Error: ${message.message}`);
                      break;
                    case 'globalError':
                      console.error('❌ Global AR error:', message);
                      setWebViewError(`AR Error: ${message.message}`);
                      break;
                    case 'videoLoaded':
                      console.log('✅ Video loaded successfully');
                      break;
                  }
                } catch (e) {
                  console.log('📨 WebView raw message:', event.nativeEvent.data);
                }
              }}
            />
          )}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructions}>Point camera at your marker image</Text>
            <Text style={styles.subInstructions}>
              Keep the marker image centered and well-lit
            </Text>
            <Text style={styles.debugInfo}>
              Marker ID: {markerId?.substring(0, 8)}...
            </Text>
          </View>
          <TouchableOpacity style={styles.backButton} onPress={resetARState}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={isScanning ? ({ data }) => handleScan(data) : undefined}
        />
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningFrame}>
            <View style={styles.scanningCorner} />
            <View style={[styles.scanningCorner, styles.topRight]} />
            <View style={[styles.scanningCorner, styles.bottomLeft]} />
            <View style={[styles.scanningCorner, styles.bottomRight]} />
          </View>
        </View>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructions}>
            {isScanning ? 'Scan a QR code to start the AR experience' : 'Processing...'}
          </Text>
          <Text style={styles.subInstructions}>
            Make sure the QR code is clearly visible and well-lit
          </Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={resetARState}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1a0a00" />
      <View style={styles.container}>
        <View style={styles.backgroundGradient} />
        <View style={styles.gridOverlay} />
        <View style={styles.arElement1} />
        <View style={styles.arElement2} />
        <View style={styles.arElement3} />
        <View style={styles.scanLine1} />
        <View style={styles.scanLine2} />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userNameText}>{loading ? 'Loading...' : getUserDisplayName()}</Text>
              {user?.email && <Text style={styles.userEmailText}>{user.email}</Text>}
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress} disabled={!user}>
              <Text style={styles.profileIcon}>
                {typeof getUserInitials() === 'string' && getUserInitials().length <= 2 ? getUserInitials() : '👤'}
              </Text>
            </TouchableOpacity>
          </View>

          {user && (
            <View style={styles.userCard}>
              <View style={styles.userCardHeader}>
                <Text style={styles.userCardTitle}>Account Status</Text>
                <View style={[styles.statusIndicator, { backgroundColor: '#10b981' }]} />
              </View>
              <View style={styles.userCardContent}>
                <View style={styles.userInfoRow}>
                  <Text style={styles.userInfoLabel}>Status</Text>
                  <Text style={styles.userInfoValue}>✅ Verified</Text>
                </View>
                <View style={styles.userInfoRow}>
                  <Text style={styles.userInfoLabel}>Account</Text>
                  <Text style={styles.userInfoValue}>🔒 Secured</Text>
                </View>
                {user.phone && (
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userInfoLabel}>Phone</Text>
                    <Text style={styles.userInfoValue}>📱 {user.phone}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent AR Sessions</Text>
            {arSessions.map((session) => renderARSession(session))}
          </View>

          <ARWorldButton onPress={() => setShowCamera(true)} />
        </ScrollView>
      </View>
    </>
  );
}

// Add the styles object
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: '#1a0a00',
    opacity: 0.8,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: 'transparent',
  },
  arElement1: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f97316',
    opacity: 0.3,
  },
  arElement2: {
    position: 'absolute',
    top: 200,
    left: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06b6d4',
    opacity: 0.4,
  },
  arElement3: {
    position: 'absolute',
    bottom: 200,
    right: 40,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8b5cf6',
    opacity: 0.3,
  },
  scanLine1: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f97316',
    opacity: 0.5,
  },
  scanLine2: {
    position: 'absolute',
    bottom: 300,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#06b6d4',
    opacity: 0.4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 5,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  userEmailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f97316',
  },
  profileIcon: {
    fontSize: 18,
    color: '#f97316',
  },
  userCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#1f2937',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  userCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  userCardContent: {
    gap: 10,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfoLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  userInfoValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sessionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  sessionIconText: {
    fontSize: 20,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 14,
    color: '#9ca3af',
  },
  sessionAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionActionText: {
    fontSize: 18,
    color: '#f97316',
  },
  arWorldButton: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#f97316',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: '#f97316',
    borderRadius: 22,
    opacity: 0.3,
  },
  arWorldButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  arWorldButtonSubtext: {
    fontSize: 14,
    color: '#fed7aa',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scanningCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#f97316',
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 5,
  },
  subInstructions: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  debugInfo: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  backButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(249, 115, 22, 0.9)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  errorDetails: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#f97316',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    minWidth: 120,
  },
});