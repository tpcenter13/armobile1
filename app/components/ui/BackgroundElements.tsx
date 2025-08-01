// components/ui/BackgroundElements.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../../utils/constants';

export default function BackgroundElements() {
  return (
    <>
      <View style={styles.backgroundGradient} />
      <View style={styles.gridOverlay} />
      <View style={styles.arElement1} />
      <View style={styles.arElement2} />
      <View style={styles.arElement3} />
      <View style={styles.scanLine1} />
      <View style={styles.scanLine2} />
    </>
  );
}

const styles = StyleSheet.create({
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: COLORS.backgroundGradient,
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
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  arElement2: {
    position: 'absolute',
    top: 200,
    left: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    opacity: 0.4,
  },
  arElement3: {
    position: 'absolute',
    bottom: 200,
    right: 40,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.accent,
    opacity: 0.3,
  },
  scanLine1: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
  },
  scanLine2: {
    position: 'absolute',
    bottom: 300,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.secondary,
    opacity: 0.4,
  },
});