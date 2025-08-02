import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Camera, CameraView as ExpoCameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    Dimensions,
    StyleSheet,
    View
} from 'react-native';
import { useARSession } from '../../hooks/useARSession';
import WebViewAR from '../common/WebViewAR';
import LoadingSpinner from '../ui/LoadingSpinner';
import QRScannerOverlay from './QRScanner';
import ScanningOverlay from './ScanningOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CameraView: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const cameraRef = useRef<ExpoCameraView>(null);
  const navigation = useNavigation();
  
  const {
    markerData,
    isLoading,
    error,
    fetchMarkerData,
    clearCache
  } = useARSession();

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Handle back button press
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (!isScanning && scannedData) {
          // If AR view is active, go back to scanning
          handleBackToScanning();
          return true;
        }
        // Otherwise, let the default back behavior happen
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription?.remove();
    }, [isScanning, scannedData])
  );

  const parseQRCodeUrl = (url: string): string | null => {
    console.log('Parsed URL:', url);
    
    try {
      // Handle different URL formats
      if (url.includes('/ar/')) {
        const parts = url.split('/ar/');
        if (parts.length > 1) {
          const markerId = parts[1].split('?')[0]; // Remove query params if any
          return markerId;
        }
      }
      
      // If it's just a UUID, return it directly
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(url)) {
        return url;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing QR code URL:', error);
      return null;
    }
  };

  const handleQRCodeScanned = async (data: string) => {
    if (!data || !isScanning) return;

    console.log('QR Code scanned:', data);
    
    const markerId = parseQRCodeUrl(data);
    if (!markerId) {
      Alert.alert('Error', 'Invalid QR code format');
      return;
    }

    setIsScanning(false);
    setScannedData(data);

    try {
      // Clear any existing cache for this marker
      clearCache(markerId);
      
      console.log('Fetching marker data for:', markerId);
      await fetchMarkerData(markerId);
    } catch (error) {
      console.error('Error fetching marker data:', error);
      Alert.alert('Error', 'Failed to load AR content');
      handleBackToScanning();
    }
  };

  const handleBackToScanning = () => {
    setIsScanning(true);
    setScannedData(null);
  };

  const handleWebViewError = (error: string) => {
    console.error('WebView error:', error);
    Alert.alert('AR Error', 'Failed to load AR content', [
      { text: 'Try Again', onPress: handleBackToScanning }
    ]);
  };

  if (hasPermission === null) {
    return <LoadingSpinner />;
  }

  if (hasPermission === false) {
    Alert.alert('Permission Required', 'Camera access is required for AR scanning');
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {isScanning ? (
        <>
          <ExpoCameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onBarcodeScanned={isScanning ? ({ data }) => handleQRCodeScanned(data) : undefined}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <QRScannerOverlay
  onScan={(data: string) => handleQRCodeScanned(data)}
  onCancel={handleBackToScanning}
/>

<ScanningOverlay isScanning={isScanning} />
        </>
      ) : (
        <View style={styles.arContainer}>
          {isLoading ? (
            <LoadingSpinner />
          ) : markerData ? (
            <WebViewAR
              markerData={markerData}
              onError={handleWebViewError}
              onBackPress={handleBackToScanning}
            />
          ) : (
            <LoadingSpinner />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  arContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default CameraView;