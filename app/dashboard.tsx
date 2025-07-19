import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface ARSession {
  id: string;
  name: string;
  duration: string;
  type: string;
  icon: string;
}

interface ARStat {
  label: string;
  value: string;
  icon: string;
  color: string;
}

export default function Dashboard() {
  const [activeMode, setActiveMode] = useState('scanning');
  const [arSessions] = useState<ARSession[]>([
    { id: '1', name: '3D Object Scan', duration: '2h 15m', type: 'Object', icon: '📦' },
    { id: '2', name: 'Environment Map', duration: '45m', type: 'Mapping', icon: '🗺️' },
    { id: '3', name: 'Face Tracking', duration: '1h 30m', type: 'Tracking', icon: '👤' },
    { id: '4', name: 'AR Markers', duration: '3h 20m', type: 'Markers', icon: '🎯' },
  ]);

  const [arStats] = useState<ARStat[]>([
    { label: 'Objects Scanned', value: '142', icon: '🔍', color: '#f97316' },
    { label: 'AR Sessions', value: '89', icon: '⚡', color: '#fb923c' },
    { label: 'Hours Active', value: '67.5', icon: '⏱️', color: '#f59e0b' },
    { label: 'Accuracy', value: '94.2%', icon: '🎯', color: '#10b981' },
  ]);

  const quickActions = [
    { id: '1', title: 'Start Scan', icon: '🔍', color: '#f97316' },
    { id: '2', title: 'AR Camera', icon: '📷', color: '#fb923c' },
    { id: '3', title: 'Calibrate', icon: '⚙️', color: '#f59e0b' },
    { id: '4', title: 'Gallery', icon: '🖼️', color: '#8b5cf6' },
  ];

  const renderARSession = ({ item }: { item: ARSession }) => (
    <TouchableOpacity style={styles.sessionCard}>
      <View style={styles.sessionIcon}>
        <Text style={styles.sessionIconText}>{item.icon}</Text>
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionName}>{item.name}</Text>
        <Text style={styles.sessionType}>{item.type} • {item.duration}</Text>
      </View>
      <View style={styles.sessionAction}>
        <Text style={styles.sessionActionText}>▶</Text>
      </View>
    </TouchableOpacity>
  );

  const renderQuickAction = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.quickActionCard, { borderColor: item.color }]}>
      <Text style={styles.quickActionIcon}>{item.icon}</Text>
      <Text style={styles.quickActionText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1a0a00" />
      <View style={styles.container}>
        {/* Background Elements */}
        <View style={styles.backgroundGradient} />
        <View style={styles.gridOverlay} />
        
        {/* AR Elements */}
        <View style={styles.arElement1} />
        <View style={styles.arElement2} />
        <View style={styles.arElement3} />
        
        {/* Scanning Lines */}
        <View style={styles.scanLine1} />
        <View style={styles.scanLine2} />

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userNameText}>AR Explorer</Text>
            </View>
            <TouchableOpacity style={styles.profileButton}>
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>

          {/* AR Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>AR System Status</Text>
              <View style={[styles.statusIndicator, { backgroundColor: '#10b981' }]} />
            </View>
            <View style={styles.statusContent}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Camera</Text>
                <Text style={styles.statusValue}>✅ Active</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Tracking</Text>
                <Text style={styles.statusValue}>🎯 Precise</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Sensors</Text>
                <Text style={styles.statusValue}>⚡ Optimal</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <FlatList
              data={quickActions}
              renderItem={renderQuickAction}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsContainer}
            />
          </View>

          {/* AR Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AR Statistics</Text>
            <View style={styles.statsGrid}>
              {arStats.map((stat, index) => (
                <View key={index} style={[styles.statCard, { borderColor: stat.color }]}>
                  <Text style={styles.statIcon}>{stat.icon}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Mode Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AR Mode</Text>
            <View style={styles.modeSelector}>
              {['scanning', 'tracking', 'mapping'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    activeMode === mode && styles.activeModeButton
                  ]}
                  onPress={() => setActiveMode(mode)}
                >
                  <Text style={[
                    styles.modeText,
                    activeMode === mode && styles.activeModeText
                  ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent AR Sessions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent AR Sessions</Text>
            {arSessions.map((session) => (
              <View key={session.id}>
                {renderARSession({ item: session })}
              </View>
            ))}
          </View>

          {/* AR World Access Button */}
          <TouchableOpacity style={styles.arWorldButton}>
            <View style={styles.buttonGlow} />
            <Text style={styles.arWorldButtonText}>🥽 ENTER AR WORLD</Text>
            <Text style={styles.arWorldButtonSubtext}>Start New Session</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a00',
    position: 'relative',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a0a00',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f97316',
  },
  arElement1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#f97316',
    top: 60,
    right: 20,
    opacity: 0.2,
    backgroundColor: 'transparent',
  },
  arElement2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fb923c',
    bottom: 200,
    left: 30,
    opacity: 0.3,
    backgroundColor: 'transparent',
  },
  arElement3: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
    top: 300,
    left: 15,
    opacity: 0.25,
    backgroundColor: 'transparent',
  },
  scanLine1: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#f97316',
    top: '20%',
    opacity: 0.3,
  },
  scanLine2: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#fb923c',
    bottom: '30%',
    opacity: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 2,
    borderColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  statusCard: {
    margin: 20,
    padding: 20,
    backgroundColor: 'rgba(26, 10, 0, 0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    color: '#f1f5f9',
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  quickActionsContainer: {
    paddingRight: 20,
  },
  quickActionCard: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(26, 10, 0, 0.8)',
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 10,
    color: '#f1f5f9',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(26, 10, 0, 0.8)',
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 10, 0, 0.8)',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeModeButton: {
    backgroundColor: '#f97316',
  },
  modeText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  activeModeText: {
    color: '#1a0a00',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 10, 0, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    padding: 16,
    marginBottom: 12,
  },
  sessionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 2,
    borderColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    color: '#f1f5f9',
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 12,
    color: '#64748b',
  },
  sessionAction: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionActionText: {
    fontSize: 16,
    color: '#f97316',
  },
  arWorldButton: {
    marginHorizontal: 20,
    marginTop: 20,
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#f97316',
    paddingVertical: 20,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
  },
  buttonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  arWorldButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f97316',
    letterSpacing: 1,
    marginBottom: 4,
  },
  arWorldButtonSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
});