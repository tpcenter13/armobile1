// services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MarkerData, User } from '../../types';

export class StorageService {
  // Auth related storage
  static async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('authToken', token);
  }

  static async getAuthToken(): Promise<string | null> {
    return AsyncStorage.getItem('authToken');
  }

  static async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('authToken');
  }

  // User data storage
  static async setUser(user: User): Promise<void> {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  }

  static async getUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  static async removeUser(): Promise<void> {
    await AsyncStorage.removeItem('user');
  }

  // Marker data caching
  static async cacheMarkerData(markerId: string, data: MarkerData): Promise<void> {
    await AsyncStorage.setItem(`marker_${markerId}`, JSON.stringify({
      ...data,
      cachedAt: Date.now(),
    }));
  }

  static async getCachedMarkerData(markerId: string): Promise<MarkerData | null> {
    const cachedData = await AsyncStorage.getItem(`marker_${markerId}`);
    if (!cachedData) return null;

    try {
      const parsed = JSON.parse(cachedData);
      // Check if cache is older than 24 hours
      const cacheAge = Date.now() - (parsed.cachedAt || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge > maxAge) {
        await this.removeCachedMarkerData(markerId);
        return null;
      }

      // Remove the cachedAt property before returning
      const { cachedAt, ...markerData } = parsed;
      return markerData;
    } catch (error) {
      console.error('Error parsing cached marker data:', error);
      await this.removeCachedMarkerData(markerId);
      return null;
    }
  }

  static async removeCachedMarkerData(markerId: string): Promise<void> {
    await AsyncStorage.removeItem(`marker_${markerId}`);
  }

  // App settings
  static async setSetting(key: string, value: any): Promise<void> {
    await AsyncStorage.setItem(`setting_${key}`, JSON.stringify(value));
  }

  static async getSetting<T>(key: string, defaultValue?: T): Promise<T | null> {
    const value = await AsyncStorage.getItem(`setting_${key}`);
    if (!value) return defaultValue || null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`Error parsing setting ${key}:`, error);
      return defaultValue || null;
    }
  }

  static async removeSetting(key: string): Promise<void> {
    await AsyncStorage.removeItem(`setting_${key}`);
  }

  // Clear all data (logout)
  static async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(['authToken', 'user']);
  }

  // Clear only cache data
  static async clearCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('marker_'));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  }

  // Get cache size (for debugging)
  static async getCacheInfo(): Promise<{ keys: string[]; size: number }> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('marker_'));
    
    let totalSize = 0;
    for (const key of cacheKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        totalSize += new Blob([data]).size;
      }
    }

    return {
      keys: cacheKeys,
      size: totalSize,
    };
  }
}