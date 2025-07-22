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
  View
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

  const fetchMarkerData = async (markerId: string, retries = 3, delay = 2000) => {
  try {
    setIsPreparing(true);
    setWebViewError(null);
    console.log('Fetching marker data for:', markerId);

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No internet connection');
    }

    const cachedData = await AsyncStorage.getItem(`marker_${markerId}`);
    if (cachedData) {
      console.log('Using cached marker data');
      const data = JSON.parse(cachedData);
      // Fix: Use imageUrl as fallback for patternUrl
      if (!data.patternUrl) {
        data.patternUrl = data.imageUrl;
        console.log('No patternUrl in cached data, using imageUrl as fallback');
      }
      setMarkerData(data);
      setMarkerId(markerId);
      setIsPreparing(false);
      setShowImageScanner(true);
      return;
    }

    console.log('Fetching from Firebase...');
    const docRef = doc(db, 'markers', markerId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as MarkerData;
      console.log('Marker data found:', data);
      
      // Fix: Use imageUrl as fallback for patternUrl
      if (!data.patternUrl) {
        data.patternUrl = data.imageUrl;
        console.log('No patternUrl found, using imageUrl as fallback');
      }
      
      setMarkerData(data);
      setMarkerId(markerId);
      await AsyncStorage.setItem(`marker_${markerId}`, JSON.stringify(data));
      setIsPreparing(false);
      setShowImageScanner(true);
    } else {
      console.log('Marker not found in Firebase');
      Alert.alert('Error', 'Marker not found');
      resetARState();
    }
  } catch (error: any) {
    console.error('Error fetching marker data:', error.message || error);
    if (retries > 0 && error.message !== 'No internet connection') {
      console.log(`Retrying (${retries} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchMarkerData(markerId, retries - 1, delay);
    }
    Alert.alert('Error', `Failed to load marker data: ${error.message || 'Check your connection and try again.'}`);
    if (retries === 0) {
      resetARState();
    }
  }
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
    }, 3000);

    try {
      const url = new URL(data);
      console.log('Parsed URL:', url);
      
      if (url.hostname === 'arweb-tau.vercel.app' && url.pathname === '/ar') {
        const markerId = url.searchParams.get('markerId');
        console.log('Extracted markerId:', markerId);
        
        if (markerId) {
          fetchMarkerData(markerId);
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

    // Fixed WebView AR Implementation
    if (showImageScanner && markerData && markerId) {
      // Create inline HTML for AR
      const arHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
          <title>AR Experience</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/aframe/1.4.0/aframe.min.js"></script>
          <script src="https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/aframe/build/aframe-ar.min.js"></script>
          <style>
            body { margin: 0; background: transparent; overflow: hidden; }
            .loading { 
              position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
              color: white; background: rgba(0,0,0,0.8); padding: 20px; border-radius: 8px; 
              text-align: center; z-index: 1000; 
            }
            .debug { 
              position: fixed; top: 10px; left: 10px; right: 10px; 
              background: rgba(0,0,0,0.8); color: white; padding: 10px; 
              border-radius: 5px; font-size: 12px; z-index: 999; 
            }
          </style>
        </head>
        <body>
          <div id="loading" class="loading">
            <div>📱 Initializing AR...</div>
            <div style="font-size: 12px; margin-top: 10px;">Point camera at marker image</div>
          </div>

          <div id="debug" class="debug" style="display: none;">
            <div id="status">🔍 Searching for marker...</div>
            <div style="font-size: 10px; margin-top: 5px;" id="info">Marker: ${markerId.substring(0, 8)}...</div>
          </div>

          <a-scene
            vr-mode-ui="enabled: false"
            arjs="sourceType: webcam; debugUIEnabled: true; detectionMode: mono_and_matrix; matrixCodeType: 3x3; trackingMethod: best; maxDetectionRate: 60; canvasWidth: 640; canvasHeight: 480;"
            embedded
            renderer="logarithmicDepthBuffer: true; colorManagement: true; sortObjects: true; antialias: true; alpha: true; precision: mediump;"
            style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;"
          >
            <a-assets>
              <img id="marker-image" src="${markerData.imageUrl}" crossorigin="anonymous">
              <video
                id="ar-video"
                src="${markerData.videoUrl}"
                preload="metadata"
                loop
                crossorigin="anonymous"
                webkit-playsinline="true"
                playsinline
                muted
                style="display: none;"
              ></video>
            </a-assets>

            <a-camera 
              gps-camera 
              rotation-reader
              arjs-look-controls="smoothingFactor: 0.1"
            ></a-camera>

            <!-- Use the patternUrl for custom marker -->
            <a-marker 
              type="pattern" 
              url="${markerData.patternUrl}"
              registerevents="true" 
              id="custom-marker"
              smooth="true"
              smoothCount="10"
              smoothTolerance="0.01"
              smoothThreshold="5"
            >
              <a-plane
                position="0 0 0"
                rotation="-90 0 0"
                width="2"
                height="1.5"
                material="src: #ar-video; transparent: true; alphaTest: 0.1; opacity: 0.9;"
                animation__found="property: scale; to: 1.1 1.1 1.1; startEvents: markerFound; dur: 300"
                animation__lost="property: scale; to: 1 1 1; startEvents: markerLost; dur: 300"
              ></a-plane>
              
              <!-- Success indicator -->
              <a-text 
                value="🎯 AR ACTIVE!" 
                position="0 1.2 0" 
                color="#00ff88" 
                scale="0.6 0.6 0.6"
                align="center"
                animation__pulse="property: scale; to: 0.7 0.7 0.7; dir: alternate; dur: 1000; loop: true"
              ></a-text>
            </a-marker>

            <!-- Fallback: Hiro marker for testing -->
            <a-marker 
              preset="hiro" 
              registerevents="true" 
              id="hiro-fallback"
              smooth="true"
            >
              <a-plane
                position="0 0 0"
                rotation="-90 0 0"
                width="2"
                height="1.5"
                material="src: #ar-video; transparent: true; alphaTest: 0.1;"
              ></a-plane>
              <a-text 
                value="HIRO MARKER (FALLBACK)" 
                position="0 1.2 0" 
                color="#ffaa00" 
                scale="0.4 0.4 0.4"
                align="center"
              ></a-text>
            </a-marker>
          </a-scene>

          <script>
            let markerFound = false;
            let videoElement = null;
            
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => console.log('Camera access granted'))
              .catch(err => console.error('Camera access error:', err.message));
            
            document.addEventListener('DOMContentLoaded', function() {
              try {
                const scene = document.querySelector('a-scene');
                if (!scene) {
                  throw new Error('A-Frame scene not found');
                }
                scene.addEventListener('loaded', () => console.log('A-Frame scene loaded'));
                scene.addEventListener('error', (e) => console.error('A-Frame error:', e.message));

                const arjs = scene.systems['arjs'];
                if (!arjs) {
                  throw new Error('AR.js system not initialized');
                }
                console.log('AR.js initialized');

                setTimeout(function() {
                  document.getElementById('loading').style.display = 'none';
                  document.getElementById('debug').style.display = 'block';
                  
                  videoElement = document.querySelector('#ar-video');
                  const customMarker = document.querySelector('#custom-marker');
                  const hiroMarker = document.querySelector('#hiro-fallback');
                  
                  console.log('AR Scene initialized');
                  
                  if (videoElement) {
                    videoElement.addEventListener('loadeddata', function() {
                      console.log('Video loaded successfully');
                    });
                    
                    videoElement.addEventListener('error', function(e) {
                      console.error('Video error:', e);
                    });
                    
                    videoElement.load();
                  }
                  
                  function handleMarkerFound(markerType) {
                    if (!markerFound) {
                      markerFound = true;
                      document.getElementById('status').innerHTML = '🎯 Marker Found!';
                      console.log(markerType + ' marker found!');
                      
                      if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ 
                          type: 'markerFound',
                          marker: markerType
                        }));
                      }
                      
                      if (videoElement) {
                        videoElement.currentTime = 0;
                        const playPromise = videoElement.play();
                        if (playPromise) {
                          playPromise.catch(function(error) {
                            console.log('Video autoplay prevented:', error);
                            const playBtn = document.createElement('button');
                            playBtn.innerHTML = '▶ Play AR Video';
                            playBtn.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #f97316; color: white; padding: 15px 25px; border: none; border-radius: 8px; font-size: 16px; z-index: 1001; cursor: pointer;';
                            playBtn.onclick = function() {
                              videoElement.play();
                              document.body.removeChild(playBtn);
                            };
                            document.body.appendChild(playBtn);
                          });
                        }
                      }
                    }
                  }
                  
                  function handleMarkerLost(markerType) {
                    if (markerFound) {
                      markerFound = false;
                      document.getElementById('status').innerHTML = '🔍 Searching for marker...';
                      console.log(markerType + ' marker lost');
                      
                      if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ 
                          type: 'markerLost',
                          marker: markerType
                        }));
                      }
                      
                      if (videoElement) {
                        videoElement.pause();
                      }
                    }
                  }
                  
                  if (customMarker) {
                    customMarker.addEventListener('markerFound', function() {
                      handleMarkerFound('custom');
                    });
                    
                    customMarker.addEventListener('markerLost', function() {
                      handleMarkerLost('custom');
                    });
                  }
                  
                  if (hiroMarker) {
                    hiroMarker.addEventListener('markerFound', function() {
                      handleMarkerFound('hiro');
                    });
                    
                    hiroMarker.addEventListener('markerLost', function() {
                      handleMarkerLost('hiro');
                    });
                  }
                  
                  setInterval(function() {
                    const scene = document.querySelector('a-scene');
                    if (scene && scene.is && scene.is('loaded')) {
                      const info = document.getElementById('info');
                      if (info) {
                        info.innerHTML = 'Scene: ✅ | Video: ' + (videoElement && videoElement.readyState >= 2 ? '✅' : '⏳') + ' | Marker: ' + (markerFound ? '🎯' : '🔍');
                      }
                    }
                  }, 1000);
                  
                }, 2000);
              } catch (error) {
                console.error('AR initialization error:', error.message);
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ 
                    type: 'error',
                    message: 'AR initialization failed: ' + error.message
                  }));
                }
              }
            });
            
            window.onerror = function(message, source, lineno, colno, error) {
              console.error('Error:', message, source, lineno, error ? error.stack : 'No stack');
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ 
                  type: 'error',
                  message: message,
                  source: source,
                  line: lineno,
                  stack: error ? error.stack : 'No stack'
                }));
              }
            };
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
              allowsInlineMediaPlaybook={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              mixedContentMode="compatibility"
              allowsAccessToCamera={true}
              androidHardwareAccelerationDisabled={false}
              androidLayerType="hardware"
              onMessage={(event) => {
                try {
                  const message = JSON.parse(event.nativeEvent.data);
                  console.log('WebView message:', message);
                  
                  switch(message.type) {
                    case 'markerFound':
                      console.log(`🎯 ${message.marker} marker found!`);
                      break;
                    case 'markerLost':
                      console.log(`❌ ${message.marker} marker lost`);
                      break;
                    case 'error':
                      console.error('AR Error:', message);
                      setWebViewError(`AR Error: ${message.message}`);
                      break;
                  }
                } catch (e) {
                  console.log('WebView raw message:', event.nativeEvent.data);
                }
              }}
              onError={(syntheticEvent) => {
                console.error('WebView error:', syntheticEvent.nativeEvent);
                setWebViewError(`Error: ${syntheticEvent.nativeEvent.description || 'Unknown error'}`);
              }}
              onHttpError={(syntheticEvent) => {
                console.error('WebView HTTP error:', syntheticEvent.nativeEvent);
                setWebViewError(`HTTP ${syntheticEvent.nativeEvent.statusCode}: ${syntheticEvent.nativeEvent.description || 'Server error'}`);
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

    // QR Code Scanner
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a00',
    position: 'relative',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    backgroundColor: 'transparent',
  },
  arElement1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#f97316',
    top: '10%',
    right: '5%',
    opacity: 0.2,
    backgroundColor: 'transparent',
  },
  arElement2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#f97316',
    bottom: '15%',
    left: '5%',
    opacity: 0.15,
    backgroundColor: 'transparent',
  },
  arElement3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#f97316',
    top: '30%',
    left: '10%',
    opacity: 0.25,
    backgroundColor: 'transparent',
  },
  scanLine1: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#f97316',
    opacity: 0.3,
    top: '20%',
  },
  scanLine2: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#f97316',
    opacity: 0.3,
    bottom: '20%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: '600',
  },
  userNameText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userEmailText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  userCardContent: {
    gap: 8,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userInfoLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  userInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionIconText: {
    fontSize: 20,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionType: {
    color: '#9ca3af',
    fontSize: 12,
  },
  sessionAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionActionText: {
    color: '#f97316',
    fontSize: 16,
  },
  arWorldButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  buttonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.3,
  },
  arWorldButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  arWorldButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderBottomWidth: 0,
    borderRightWidth: 3,
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
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  instructions: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subInstructions: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: '#f97316',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  errorText: {
    color: '#f97316',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorDetails: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#f97316',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  debugInfo: {
    color: '#9ca3af',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});