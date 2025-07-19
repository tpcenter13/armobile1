import React, { useState } from 'react';
import {
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

export default function Index() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '' });
  };

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = () => {
    if (isLogin) {
      console.log('Logging in with:', formData);
    } else {
      console.log('Signing up with:', formData);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#f97316" />
      <View style={styles.container}>
        <View style={styles.backgroundGradient} />
        
        {/* AR Grid Pattern */}
        <View style={styles.gridOverlay} />
        
        {/* Floating AR Elements */}
        <View style={styles.arElement1} />
        <View style={styles.arElement2} />
        <View style={styles.arElement3} />
        
        {/* Scanning Lines */}
        <View style={styles.scanLine1} />
        <View style={styles.scanLine2} />

        <KeyboardAvoidingView
          style={{ flex: 1, width: '100%' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={30}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* AR App Logo/Title */}
            <View style={styles.logoContainer}>
              <Text style={styles.appTitle}>AR VISION</Text>
              <Text style={styles.appSubtitle}>Augmented Reality Platform</Text>
              <View style={styles.logoAccent} />
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.title}>{isLogin ? 'Access AR World' : 'Join AR Reality'}</Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Enter your credentials to dive into augmented reality' : 'Create your AR profile and explore new dimensions'}
              </Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputGlow} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#64748b"
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
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  onChangeText={(text) => handleChange('password', text)}
                  value={formData.password}
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
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

              {/* AR Feature Highlights */}
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
    backgroundColor: '#1a0a00',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'linear-gradient(135deg, #1a0a00 0%, #2d1810 50%, #f97316 100%)',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    backgroundColor: 'transparent',
    // Add a subtle grid pattern
    borderWidth: 1,
    borderColor: '#f97316',
    borderStyle: 'solid',
  },
  arElement1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#f97316',
    top: 80,
    right: 30,
    opacity: 0.3,
    backgroundColor: 'transparent',
  },
  arElement2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fb923c',
    bottom: 120,
    left: 40,
    opacity: 0.4,
    backgroundColor: 'transparent',
  },
  arElement3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#f59e0b',
    top: 200,
    left: 20,
    opacity: 0.3,
    backgroundColor: 'transparent',
  },
  scanLine1: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#f97316',
    top: '30%',
    opacity: 0.5,
  },
  scanLine2: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#fb923c',
    bottom: '25%',
    opacity: 0.4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f97316',
    letterSpacing: 3,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#fb923c',
    marginTop: 4,
    letterSpacing: 1,
  },
  logoAccent: {
    width: 80,
    height: 3,
    backgroundColor: '#f97316',
    marginTop: 8,
    borderRadius: 2,
  },
  formContainer: {
    width: '90%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 24,
    backgroundColor: 'rgba(26, 10, 0, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    shadowColor: '#f97316',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    opacity: 0,
  },
  input: {
    borderWidth: 2,
    borderColor: '#ea580c',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    backgroundColor: 'rgba(52, 21, 8, 0.8)',
    color: '#f1f5f9',
    marginBottom: 0,
  },
  button: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  buttonText: {
    textAlign: 'center',
    color: '#f97316',
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
    color: '#64748b',
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
    color: '#64748b',
    textAlign: 'center',
  },
});