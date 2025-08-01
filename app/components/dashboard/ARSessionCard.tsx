// components/dashboard/ARSessionCard.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ARSession } from '../../types';
import { COLORS } from '../../utils/constants';

interface ARSessionCardProps {
  session: ARSession;
  onPress?: (session: ARSession) => void;
}

export default function ARSessionCard({ session, onPress }: ARSessionCardProps) {
  return (
    <TouchableOpacity 
      style={styles.sessionCard} 
      onPress={() => onPress?.(session)}
    >
      <View style={styles.sessionIcon}>
        <Text style={styles.sessionIconText}>{session.icon}</Text>
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionName}>{session.name}</Text>
        <Text style={styles.sessionType}>
          {session.type} • {session.duration}
        </Text>
      </View>
      <View style={styles.sessionAction}>
        <Text style={styles.sessionActionText}>▶</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.border,
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
    color: COLORS.text,
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sessionAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionActionText: {
    fontSize: 18,
    color: COLORS.primary,
  },
});