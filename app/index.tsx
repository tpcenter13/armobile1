// index.tsx (Refactored)
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Components
import { BackgroundElements } from './components';

// Services
import { ApiService, StorageService } from './components/services';

// Types & Constants
import { COLORS } from './utils/constants';

export default function Index() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    firstName: '', 
    lastName: '' 
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = () => {
    console.log('Toggling between login and signup');
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', firstName: '', lastName: '' });
  };

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    console.log('Submit button clicked, isLogin:', isLogin, 'formData:', formData);
    setIsLoading(true);
    
    try {
      if (isLogin) {
        console.log('Attempting login...');
        const response = await ApiService.login(formData.email, formData.password);
        
        const { token, user } = response;
        
        // Store auth data
        await StorageService.setAuthToken(token);
        await StorageService.setUser(user);

        console.log('Login successful:', user);
        router.push('/dashboard');
      } else {
        console.log('Attempting signup...');
        const response = await ApiService.signup(
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName
        );

        console.log('Signup successful:', response);
        Alert.alert('Success', 'Account created! Please log in.');
        setIsLogin(true);
        setFormData({ email: formData.email, password: '', firstName: '', lastName: '' });
      }
    } catch (error: any) {
      console.error('Error during submit:', error.message);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.container}>
        <BackgroundElements />

        <KeyboardAvoidingView
          style={{ flex: 1, width: '100%' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={30}
        >
          <ScrollView
            contentContainerStyle={{ 
              flexGrow: 1, 
              justifyContent: 'center', 
              alignItems: 'center', 
              paddingVertical: 40 
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.logoContainer}>
              <Text style={styles.appTitle}>AR VISION</Text>
              <Text style={styles.appSubtitle}>Augmented Reality Platform</Text>
              <View style={styles.logoAccent} />
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.title}>
                {isLogin ? 'Access AR World' : 'Join AR Reality'}
              </Text>
              <Text style={styles.subtitle}>
                {isLogin 
                  ? 'Enter your credentials to dive into augmented reality' 
                  : 'Create your AR profile and explore new dimensions'}
              </Text>

              {!isLogin && (
                <>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputGlow} />
                    <TextInput
                      style={styles.input}
                      placeholder="First Name"
                      placeholderTextColor={COLORS.textMuted}
                      onChangeText={(text) => handleChange('firstName', text)}
                      value={formData.firstName}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputGlow} />
                    <TextInput
                      style={styles.input}
                      placeholder="Last Name"
                      placeholderTextColor={COLORS.textMuted}
                      onChangeText={(text) => handleChange('lastName', text)}
                      value={formData.lastName}
                      autoCapitalize="words"
                    />
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.inputGlow} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={COLORS.textMuted}
                  onChangeText={(text) => handleChange('email', text)}
                  value={formData.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputGlow} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  onChangeText={(text) => handleChange('password', text)}
                  value={formData.password}
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]} 
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <View style={styles.buttonGlow} />
                <Text style={styles.buttonText}>
                  {isLogin ? 'ENTER AR WORLD' : 'CREATE AR PROFILE'}
                </Text>
                <Text style={styles.buttonIcon}>🥽</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleToggle} style={styles.toggleButton}>
                <Text style={styles.toggleText}>
                  {isLogin
                    ? "New to AR? → Create Account"
                    : 'Already have AR access? → Login'}
                </Text>
              </TouchableOpacity>

              <View style={styles.featuresContainer}>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>🌐</Text>
                  <Text style={styles.featureText}>3D Object Recognition</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>📱</Text>
                  <Text style={styles.featureText}>Real-time Tracking</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>✨</Text>
                  <Text style={styles.featureText}>Immersive Experience</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: COLORS.backgroundGradient,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 3,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    color: COLORS.primaryLight,
    marginTop: 4,
    letterSpacing: 1,
  },
  logoAccent: {
    width: 80,
    height: 3,
    backgroundColor: COLORS.primary,
    marginTop: 8,
    borderRadius: 2,
  },
  formContainer: {
    width: '90%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 24,
    backgroundColor: `rgba(26, 10, 0, 0.9)`,
    borderWidth: 1,
    borderColor: `rgba(249, 115, 22, 0.2)`,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  inputGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    backgroundColor: `rgba(249, 115, 22, 0.1)`,
    opacity: 0,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    backgroundColor: `rgba(52, 21, 8, 0.8)`,
    color: COLORS.text,
    marginBottom: 0,
  },
  button: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `rgba(249, 115, 22, 0.1)`,
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginRight: 8,
  },
  buttonIcon: {
    fontSize: 18,
  },
  toggleButton: {
    marginBottom: 32,
  },
  toggleText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 14,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});