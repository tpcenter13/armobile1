// components/dashboard/DashboardHeader.tsx
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { User } from '../../types';
import { COLORS } from '../../utils/constants';

interface DashboardHeaderProps {
  user: User | null;
  loading: boolean;
}

export default function DashboardHeader({ user, loading }: DashboardHeaderProps) {
  const getUserDisplayName = () => {
    if (!user) return 'AR Explorer';
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];
    return 'AR Explorer';
  };

  const getUserInitials = () => {
    if (!user) return '👤';
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0).toUpperCase()}${user.lastName.charAt(0).toUpperCase()}`;
    }
    if (user.firstName) return user.firstName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return '👤';
  };

  const handleProfilePress = () => {
    if (!user) return;
    Alert.alert(
      'Profile Information',
      `Name: ${getUserDisplayName()}\nEmail: ${user.email}${user.phone ? `\nPhone: ${user.phone}` : ''}`,
      [{ text: 'OK' }],
    );
  };

  return (
    <View style={styles.header}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userNameText}>
          {loading ? 'Loading...' : getUserDisplayName()}
        </Text>
        {user?.email && <Text style={styles.userEmailText}>{user.email}</Text>}
      </View>
      <TouchableOpacity 
        style={styles.profileButton} 
        onPress={handleProfilePress} 
        disabled={!user}
      >
        <Text style={styles.profileIcon}>
          {typeof getUserInitials() === 'string' && getUserInitials().length <= 2 
            ? getUserInitials() 
            : '👤'
          }
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  userEmailText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileIcon: {
    fontSize: 18,
    color: COLORS.primary,
  },
});