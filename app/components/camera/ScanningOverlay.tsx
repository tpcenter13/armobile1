// components/camera/ScanningOverlay.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ScanningOverlayProps {
  isScanning: boolean;
  instructions?: string;
  subInstructions?: string;
  showFrame?: boolean;
}

export default function ScanningOverlay({ 
  isScanning, 
  instructions = 'Scan a QR code to start the AR experience',
  subInstructions = 'Make sure the QR code is clearly visible and well-lit',
  showFrame = true 
}: ScanningOverlayProps) {
  return (
    <>
      {showFrame && (
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningFrame}>
            <View style={styles.scanningCorner} />
            <View style={[styles.scanningCorner, styles.topRight]} />
            <View style={[styles.scanningCorner, styles.bottomLeft]} />
            <View style={[styles.scanningCorner, styles.bottomRight]} />
          </View>
        </View>
      )}
      
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructions}>
          {isScanning ? instructions : 'Processing...'}
        </Text>
        <Text style={styles.subInstructions}>
          {subInstructions}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
    borderColor: COLORS.primary,
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: undefined,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: undefined,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: undefined,
    left: undefined,
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
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 5,
  },
  subInstructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});