// hooks/useMarkerData.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NetInfo from '@react-native-community/netinfo';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useState } from 'react';
import { Alert } from 'react-native';
import { MarkerData } from '../types';
import { API_URL, MAX_RETRIES, RETRY_DELAY } from '../utils/constants';

// Initialize Firebase (you'll need to do this in your app)
import { initializeApp } from 'firebase/app';
import { FIREBASE_CONFIG } from '../utils/constants';

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

export function useMarkerData() {
  const [markerData, setMarkerData] = useState<MarkerData | null>(null);
  const [markerId, setMarkerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidMarkerData = (data: any): data is MarkerData => {
    return (
      data &&
      typeof data.imageUrl === 'string' &&
      data.imageUrl.startsWith('http') &&
      typeof data.videoUrl === 'string' &&
      data.videoUrl.startsWith('http') &&
      (data.patternUrl === undefined || 
       (typeof data.patternUrl === 'string' && data.patternUrl.startsWith('http')))
    );
  };

  const clearCache = async (markerId: string) => {
    try {
      await AsyncStorage.removeItem(`marker_${markerId}`);
      console.log('Cache cleared for marker:', markerId);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const fetchMarkerData = async (
    markerId: string, 
    retries = MAX_RETRIES, 
    delay = RETRY_DELAY
  ) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching marker data for:', markerId);

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No internet connection');
      }

      // Try to get cached data first
      const cachedData = await AsyncStorage.getItem(`marker_${markerId}`);
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          if (isValidMarkerData(data)) {
            console.log('Using valid cached marker data');
            setMarkerData(data);
            setMarkerId(markerId);
            setLoading(false);
            return data;
          } else {
            console.log('Cached data is invalid, clearing cache');
            await AsyncStorage.removeItem(`marker_${markerId}`);
          }
        } catch (parseError) {
          console.log('Error parsing cached data, clearing cache');
          await AsyncStorage.removeItem(`marker_${markerId}`);
        }
      }

      // Try API first
      try {
        console.log('Fetching from API...');
        const response = await fetch(
          `${API_URL}/api/get-marker?markerId=${markerId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('API marker data:', data);

          if (isValidMarkerData(data)) {
            setMarkerData(data);
            setMarkerId(markerId);
            await AsyncStorage.setItem(`marker_${markerId}`, JSON.stringify(data));
            setLoading(false);
            return data;
          } else {
            throw new Error('Invalid marker data structure from API');
          }
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      } catch (apiError) {
        console.log('API failed, trying Firebase...', apiError);
        
        // Fallback to Firebase
        try {
          const docRef = doc(db, 'markers', markerId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as MarkerData;
            console.log('Firebase marker data:', data);

            if (!isValidMarkerData(data)) {
              throw new Error('Invalid marker data structure from Firestore');
            }

            setMarkerData(data);
            setMarkerId(markerId);
            await AsyncStorage.setItem(`marker_${markerId}`, JSON.stringify(data));
            setLoading(false);
            return data;
          } else {
            throw new Error('Marker not found in Firebase');
          }
        } catch (firebaseError) {
          console.error('Firebase also failed:', firebaseError);
          throw new Error('Both API and Firebase failed to fetch marker data');
        }
      }
    } catch (error: any) {
      console.error('Error fetching marker data:', error.message || error);
      
      // Retry logic
      if (retries > 0 && 
          !error.message.includes('Invalid') && 
          error.message !== 'No internet connection' && 
          !error.message.includes('not found')) {
        console.log(`Retrying (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchMarkerData(markerId, retries - 1, delay * 1.5);
      }
      
      const errorMessage = `Failed to load marker data: ${error.message || 'Check your connection and try again.'}`;
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMarkerData(null);
    setMarkerId(null);
    setError(null);
    setLoading(false);
  };

  return {
    markerData,
    markerId,
    loading,
    error,
    fetchMarkerData,
    clearCache,
    reset,
  };
}