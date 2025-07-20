
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  imageUrl: string; // Cloudinary URL for .patt file
  videoUrl: string; // Cloudinary URL for video
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

  // Cleanup timeout on unmount
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

  const fetchMarkerData = async (markerId: string) => {
    try {
      setIsPreparing(true);
      setWebViewError(null);
      console.log('Fetching marker data for:', markerId);

      // Check cache first
      const cachedData = await AsyncStorage.getItem(`marker_${markerId}`);
      if (cachedData) {
        console.log('Using cached marker data');
        setMarkerData(JSON.parse(cachedData));
        setMarkerId(markerId);
        setIsPreparing(false);
        setShowImageScanner(true);
        return;
      }

      // Fetch from Firebase
      console.log('Fetching from Firebase...');
      const docRef = doc(db, 'markers', markerId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as MarkerData;
        console.log('Marker data found:', data);
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
    } catch (error) {
      console.error('Error fetching marker data:', error);
      Alert.alert('Error', 'Failed to load marker data');
      resetARState();
    }
  };

  const handleScan = (data: string) => {
    // Prevent duplicate scans
    if (!isScanning || lastScanRef.current === data) {
      return;
    }

    console.log('QR Code scanned:', data);
    lastScanRef.current = data;
    setIsScanning(false);

    // Reset scanning after 3 seconds
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(true);
      lastScanRef.current = null;
    }, 3000);

    try {
      // Check if it's a valid URL first
      const url = new URL(data);
      console.log('Parsed URL:', url);
      
      // Check if it matches our expected pattern
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

    if (showImageScanner && markerData && markerId) {
      const baseUrl = API_URL.replace(/\/+$/, '');
      const arUrl = `${baseUrl}/ar?markerId=${encodeURIComponent(markerId)}`;
      console.log('Loading AR URL:', arUrl);
      
      return (
        <View style={styles.cameraContainer}>
          {webViewError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load AR experience</Text>
              <Text style={styles.errorDetails}>{webViewError}</Text>
              <Text style={styles.errorDetails}>URL: {arUrl}</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => {
                  setWebViewError(null);
                }}
              >
                <Text style={styles.backButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              key={`webview-${markerId}-${Date.now()}`}
              style={StyleSheet.absoluteFillObject}
              source={{ uri: arUrl }}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              mixedContentMode="compatibility"
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.errorContainer}>
                  <ActivityIndicator size="large" color="#f97316" />
                  <Text style={styles.instructions}>Loading AR experience...</Text>
                </View>
              )}
              onLoadStart={() => console.log('WebView loading started')}
              onLoad={() => console.log('WebView loaded successfully')}
              onLoadEnd={() => console.log('WebView loading ended')}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView error:', nativeEvent);
                setWebViewError(`Error: ${nativeEvent.description || 'Unknown error'}`);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView HTTP error:', nativeEvent);
                setWebViewError(`HTTP ${nativeEvent.statusCode}: ${nativeEvent.description || 'Server error'}`);
              }}
              renderError={(errorName) => (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Failed to load AR experience</Text>
                  <Text style={styles.errorDetails}>{errorName}</Text>
                </View>
              )}
            />
          )}
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructions}>Point camera at the image to start AR</Text>
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
        
        {/* Scanning overlay */}
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
});