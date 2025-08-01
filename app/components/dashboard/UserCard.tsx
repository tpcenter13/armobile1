// components/dashboard/UserCard.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { User } from '../../types';
import { COLORS } from '../../utils/constants';

interface UserCardProps {
  user: User;
}

export default function UserCard({ user }: UserCardProps) {
  return (
    <View style={styles.userCard}>
      <View style={styles.userCardHeader}>
        <Text style={styles.userCardTitle}>Account Status</Text>
        <View style={[styles.statusIndicator, { backgroundColor: COLORS.success }]} />
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
  );
}

const styles = StyleSheet.create({
  userCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
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
    color: COLORS.textSecondary,
  },
  userInfoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
});