// services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginResponse, MarkerData, SignupResponse, User } from '../../types';
import { API_URL } from '../../utils/constants';

export class ApiService {
  private static async getAuthHeaders() {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/api/Login`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  }

  static async signup(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<SignupResponse> {
    const response = await fetch(`${API_URL}/api/signup`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    return response.json();
  }

  static async getCurrentUser(): Promise<{ user: User }> {
    const response = await fetch(`${API_URL}/api/current-user`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    return response.json();
  }

  static async getMarker(markerId: string): Promise<MarkerData> {
    const response = await fetch(`${API_URL}/api/get-marker?markerId=${markerId}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch marker data: ${response.status}`);
    }

    return response.json();
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await fetch(`${API_URL}/api/update-profile`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Profile update failed');
    }

    return response.json();
  }

  static async uploadMarkerData(
    markerId: string,
    markerData: MarkerData
  ): Promise<void> {
    const response = await fetch(`${API_URL}/api/upload-marker`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ markerId, ...markerData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Marker upload failed');
    }
  }

  static async deleteMarker(markerId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/delete-marker/${markerId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Marker deletion failed');
    }
  }
}