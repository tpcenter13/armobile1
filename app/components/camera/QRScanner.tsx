// components/camera/QRScanner.tsx
import { BarcodeScanningResult, CameraView } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SCAN_TIMEOUT } from '../../utils/constants';
import ScanningOverlay from './ScanningOverlay';

interface QRScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
  isScanning?: boolean;
}

export default function QRScanner({ onScan, onCancel, isScanning: propIsScanning }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(propIsScanning ?? true);
  const [hasScanned, setHasScanned] = useState(false);
  const lastScanRef = useRef<string | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (hasScanned || !isScanning) return;

    setHasScanned(true);
    setIsScanning(false);
    console.log("QR Code scanned:", data);
    
    // Reset scanning state after timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(true);
      setHasScanned(false);
      lastScanRef.current = null;
    }, SCAN_TIMEOUT) as any;

    // Validate QR code format
    try {
      const url = new URL(data);
      console.log('Parsed URL:', url.toString());

      if (url.hostname === 'arweb-tau.vercel.app' && url.pathname.startsWith('/ar/')) {
        const markerId = url.pathname.split('/ar/')[1];
        
        if (markerId) {
          onScan(data);
        } else {
          console.log('No markerId in URL');
          Alert.alert('Error', 'Invalid QR code: No markerId found');
          setTimeout(() => {
            setIsScanning(true);
            setHasScanned(false);
          }, 2000);
        }
      } else {
        console.log('URL does not match expected pattern');
        Alert.alert('Error', 'Invalid QR code: Wrong URL format');
        setTimeout(() => {
          setIsScanning(true);
          setHasScanned(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error parsing QR code:', error);
      Alert.alert('Error', 'Invalid QR code format');
      setTimeout(() => {
        setIsScanning(true);
        setHasScanned(false);
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
      />
      <ScanningOverlay isScanning={isScanning} />
      <TouchableOpacity style={styles.backButton} onPress={onCancel}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: `rgba(${parseInt(COLORS.primary.slice(1, 3), 16)}, ${parseInt(COLORS.primary.slice(3, 5), 16)}, ${parseInt(COLORS.primary.slice(5, 7), 16)}, 0.9)`,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});