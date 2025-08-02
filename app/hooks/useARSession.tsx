import { useCallback, useState } from 'react';

export interface MarkerData {
  imageUrl: string;
  videoUrl: string;
  patternUrl: string;
  createdAt?: string;
}

export interface UseARSessionReturn {
  markerData: MarkerData | null;
  isLoading: boolean;
  error: string | null;
  fetchMarkerData: (markerId: string) => Promise<void>;
  clearCache: (markerId: string) => void;
  reset: () => void;
}

// Simple in-memory cache
const markerCache = new Map<string, MarkerData>();

export const useARSession = (): UseARSessionReturn => {
  const [markerData, setMarkerData] = useState<MarkerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearCache = useCallback((markerId: string) => {
    console.log('Cache cleared for marker:', markerId);
    markerCache.delete(markerId);
  }, []);

  const fetchMarkerData = useCallback(async (markerId: string): Promise<void> => {
    if (!markerId) {
      throw new Error('Marker ID is required');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedData = markerCache.get(markerId);
      if (cachedData) {
        console.log('Using cached marker data');
        setMarkerData(cachedData);
        setIsLoading(false);
        return;
      }

      console.log('Fetching from API...');
      
      // Fetch from API
      const response = await fetch(`https://arweb-tau.vercel.app/api/markers/${markerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API marker data:', data);

      // Validate the response data
      if (!data || !data.imageUrl || !data.videoUrl || !data.patternUrl) {
        throw new Error('Invalid marker data received from API');
      }

      // Ensure URLs are valid
      const validatedData: MarkerData = {
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        patternUrl: data.patternUrl,
        createdAt: data.createdAt,
      };

      // Validate URLs format
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(validatedData.imageUrl) || 
          !urlPattern.test(validatedData.videoUrl) || 
          !urlPattern.test(validatedData.patternUrl)) {
        throw new Error('Invalid URL format in marker data');
      }

      // Cache the data
      markerCache.set(markerId, validatedData);
      
      setMarkerData(validatedData);
      setError(null);
    } catch (fetchError) {
      console.error('Error fetching marker data:', fetchError);
      
      let errorMessage = 'Failed to fetch marker data';
      
      if (fetchError instanceof Error) {
        if (fetchError.message.includes('Network request failed')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (fetchError.message.includes('404')) {
          errorMessage = 'Marker not found. Please check the QR code.';
        } else if (fetchError.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = fetchError.message;
        }
      }
      
      setError(errorMessage);
      setMarkerData(null);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setMarkerData(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    markerData,
    isLoading,
    error,
    fetchMarkerData,
    clearCache,
    reset,
  };
};