// components/dashboard/ARSessionList.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ARSession } from '../../types';
import { COLORS, SAMPLE_AR_SESSIONS } from '../../utils/constants';
import ARSessionCard from './ARSessionCard';

interface ARSessionListProps {
  sessions?: ARSession[];
  onSessionPress?: (session: ARSession) => void;
}

export default function ARSessionList({ 
  sessions = SAMPLE_AR_SESSIONS, 
  onSessionPress 
}: ARSessionListProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent AR Sessions</Text>
      {sessions.map((session) => (
        <ARSessionCard 
          key={session.id} 
          session={session} 
          onPress={onSessionPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
});