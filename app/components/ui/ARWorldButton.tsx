// components/ui/ARWorldButton.tsx
import { useCameraPermissions } from 'expo-camera';
import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ARWorldButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export default function ARWorldButton({ onPress, disabled = false }: ARWorldButtonProps) {
  const [permission, requestPermission] = useCameraPermissions();

  const handleEnterARWorld = async () => {
    if (disabled) return;

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
      <View style={[styles.arWorldButton, styles.loadingButton]}>
        <Text style={styles.loadingText}>Checking camera permissions...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.arWorldButton, disabled && styles.disabledButton]} 
      onPress={handleEnterARWorld}
      disabled={disabled}
    >
      <View style={styles.buttonGlow} />
      <Text style={[styles.arWorldButtonText, disabled && styles.disabledText]}>
        🥽 ENTER AR WORLD
      </Text>
      <Text style={[styles.arWorldButtonSubtext, disabled && styles.disabledText]}>
        Start New Session
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  arWorldButton: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  loadingButton: {
    backgroundColor: COLORS.border,
  },
  disabledButton: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.6,
  },
  buttonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    opacity: 0.3,
  },
  arWorldButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  arWorldButtonSubtext: {
    fontSize: 14,
    color: '#fed7aa',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  disabledText: {
    color: COLORS.background,
  },
});