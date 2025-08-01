// components/common/ErrorHandler.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ErrorHandlerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onCancel?: () => void;
  retryText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export default function ErrorHandler({
  title = 'Error',
  message,
  onRetry,
  onCancel,
  retryText = 'Retry',
  cancelText = 'Cancel',
  showCancel = true,
}: ErrorHandlerProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      
      <View style={styles.buttonContainer}>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.buttonText}>{retryText}</Text>
          </TouchableOpacity>
        )}
        
        {showCancel && onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.buttonText}>{cancelText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  errorTitle: {
    fontSize: 24,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 15,
    width: '100%',
    maxWidth: 200,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.textMuted,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});