// dashboard.tsx (Refactored)
import { useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';



// Components
import ARScanner from './components/camera/ARScanner';
import QRScanner from './components/camera/QRScanner';
import ErrorHandler from './components/common/ErrorHandler';
import ARSessionList from './components/dashboard/ARSessionList';
import DashboardHeader from './components/dashboard/DashboardHeader';
import UserCard from './components/dashboard/UserCard';
import ARWorldButton from './components/ui/ARWorldButton';
import BackgroundElements from './components/ui/BackgroundElements';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useMarkerData } from './hooks/useMarkerData';

// Types & Constants
import { ARSession, ARState } from './types';
import { COLORS } from './utils/constants';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { markerData, markerId, loading: markerLoading, error: markerError, fetchMarkerData, clearCache, reset: resetMarkerData } = useMarkerData();
  const [permission] = useCameraPermissions();

  const [arState, setArState] = useState<ARState>({
    showCamera: false,
    showImageScanner: false,
    isPreparing: false,
    isScanning: true,
    hasScanned: false,
    markerData: null,
    markerId: null,
    webViewError: null,
  });

  const handleEnterARWorld = () => {
    setArState(prev => ({ ...prev, showCamera: true }));
  };

  const handleQRScan = async (data: string) => {
    try {
      const url = new URL(data);
      const scannedMarkerId = url.pathname.split('/ar/')[1];
      
      if (scannedMarkerId) {
        setArState(prev => ({ 
          ...prev, 
          isPreparing: true, 
          isScanning: false 
        }));
        
        // Clear cache and fetch fresh data
        await clearCache(scannedMarkerId);
        const data = await fetchMarkerData(scannedMarkerId);
        
        setArState(prev => ({
          ...prev,
          showImageScanner: true,
          isPreparing: false,
          markerData: data,
          markerId: scannedMarkerId,
        }));
      }
    } catch (error) {
      console.error('Error processing QR scan:', error);
      setArState(prev => ({ 
        ...prev, 
        isPreparing: false, 
        isScanning: true 
      }));
    }
  };

  const handleSessionPress = (session: ARSession) => {
    console.log('Session pressed:', session);
    // Handle session selection logic here
  };

  const resetARState = () => {
    setArState({
      showCamera: false,
      showImageScanner: false,
      isPreparing: false,
      isScanning: true,
      hasScanned: false,
      markerData: null,
      markerId: null,
      webViewError: null,
    });
    resetMarkerData();
  };

  const handleRetryMarkerFetch = async () => {
    if (markerId) {
      await clearCache(markerId);
      await fetchMarkerData(markerId);
    }
  };

  // Show camera/scanner views
  if (arState.showCamera) {
    // Show error if there's a marker error
    if (markerError) {
      return (
        <View style={styles.container}>
          <ErrorHandler
            title="AR Experience Failed"
            message={markerError}
            onRetry={handleRetryMarkerFetch}
            onCancel={resetARState}
            retryText="Try Again"
            cancelText="Back to Dashboard"
          />
        </View>
      );
    }

    // Show AR scanner if we have marker data
    if (arState.showImageScanner && markerData && markerId) {
      return (
        <ARScanner
          markerData={markerData}
          markerId={markerId}
          onError={(error) => setArState(prev => ({ ...prev, webViewError: error }))}
          onCancel={resetARState}
        />
      );
    }

    // Show loading state
    if (markerLoading || arState.isPreparing) {
      return (
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Preparing AR experience...</Text>
          </View>
          <ErrorHandler
            title=""
            message=""
            onCancel={resetARState}
            cancelText="Cancel"
            showCancel={true}
            onRetry={undefined}
          />
        </View>
      );
    }

    // Show QR scanner
    return (
      <QRScanner
        onScan={handleQRScan}
        onCancel={resetARState}
        isScanning={arState.isScanning}
      />
    );
  }

  // Main dashboard view
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundGradient} />
      <View style={styles.container}>
        <BackgroundElements />
        
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          <DashboardHeader user={user} loading={loading} />
          
          {user && <UserCard user={user} />}
          
          <ARSessionList onSessionPress={handleSessionPress} />
          
          <ARWorldButton 
            onPress={handleEnterARWorld}
            disabled={!permission?.granted}
          />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 20,
  },
});