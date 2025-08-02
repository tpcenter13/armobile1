// components/camera/ARScanner.tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MarkerData, WebViewMessage } from '../../types';
import { COLORS } from '../../utils/constants';
import ErrorHandler from '../common/ErrorHandler';

interface ARScannerProps {
  markerData: MarkerData;
  markerId: string;
  onError: (error: string) => void;
  onCancel: () => void;
}

export default function ARScanner({ markerData, markerId, onError, onCancel }: ARScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [webViewError, setWebViewError] = React.useState<string | null>(null);
  const [debugInfo, setDebugInfo] = React.useState<string>('Initializing...');
  const [showCamera, setShowCamera] = React.useState(true);

  // Validate marker data
  if (!markerData.patternUrl || !markerData.videoUrl) {
    return (
      <ErrorHandler
        title="Invalid Marker Data"
        message="Missing or invalid marker data"
        onRetry={() => onError('Missing or invalid marker data')}
        onCancel={onCancel}
        retryText="Retry"
        cancelText="Back"
      />
    );
  }

  // Handle camera permissions
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is required for AR scanning</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const arHTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>AR Marker Video Viewer</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/ar.js@3.4.2/aframe/build/aframe-ar.min.js"></script>
    <style>
      body {
        margin: 0;
        overflow: hidden;
        background: transparent;
      }
      #debug-overlay {
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 10px;
        font-size: 12px;
        z-index: 1000;
        max-width: 300px;
        word-wrap: break-word;
        border-radius: 5px;
      }
      .ar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 500;
      }
    </style>
  </head>
  <body>
    <div id="debug-overlay">Initializing AR overlay...</div>
    
    <a-scene
      id="ar-scene"
      class="ar-overlay"
      embedded
      vr-mode-ui="enabled: false"
      renderer="logarithmicDepthBuffer: true; colorManagement: true; sortObjects: true; alpha: true;"
      arjs="trackingMethod: best; sourceType: image; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3; patternRatio: 0.8;"
      background="transparent: true"
    >
      <a-assets>
        <video
          id="ar-video"
          src="${markerData.videoUrl}"
          preload="metadata"
          crossorigin="anonymous"
          playsinline
          webkit-playsinline
          muted
          loop
        ></video>
      </a-assets>

      <!-- Pattern Marker -->
      <a-marker
        id="marker"
        type="pattern"
        preset="custom"
        url="${markerData.patternUrl}"
        smooth="true"
        smoothCount="10"
        smoothTolerance="0.01"
        smoothThreshold="5"
      >
        <!-- Video plane -->
        <a-plane
          id="video-plane"
          visible="false"
          position="0 0 0"
          rotation="-90 0 0"
          width="2"
          height="1.5"
          material="src: #ar-video; transparent: true; alphaTest: 0.1; opacity: 0.95; shader: flat; side: double;"
        ></a-plane>
        
        <!-- Debug indicator -->
        <a-box
          id="debug-cube"
          visible="false"
          position="0 0.5 0"
          rotation="0 45 0"
          color="#ff6b35"
          width="0.2"
          height="0.2"
          depth="0.2"
          material="opacity: 0.8; transparent: true;"
        ></a-box>
      </a-marker>

      <!-- Camera entity -->
      <a-entity camera look-controls-enabled="false" wasd-controls-enabled="false"></a-entity>
    </a-scene>

    <script>
      const marker = document.querySelector("#marker");
      const video = document.querySelector("#ar-video");
      const videoPlane = document.querySelector("#video-plane");
      const debugCube = document.querySelector("#debug-cube");
      const debugOverlay = document.querySelector("#debug-overlay");
      
      let markerFound = false;
      let videoLoaded = false;
      let sceneReady = false;
      
      function updateDebug(message) {
        console.log('[AR Debug]:', message);
        debugOverlay.textContent = message;
        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            type: "debug",
            message: message,
          })
        );
      }

      // Initialize without camera since React Native handles it
      function initializeAR() {
        updateDebug("AR overlay initialized - using external camera");
        sceneReady = true;
        
        // Set up AR.js to work with external camera feed
        if (window.AFRAME && window.AFRAME.systems && window.AFRAME.systems.arjs) {
          updateDebug("✅ AR.js system ready");
        }
      }

      // Video event listeners
      video.addEventListener('loadedmetadata', () => {
        updateDebug("✅ Video metadata loaded");
        videoLoaded = true;
      });
      
      video.addEventListener('canplay', () => {
        updateDebug("✅ Video ready to play");
      });
      
      video.addEventListener('error', (e) => {
        const errorMsg = "Video error: " + (video.error?.message || e.type || "Unknown error");
        updateDebug("❌ " + errorMsg);
        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            type: "videoError",
            error: errorMsg,
          })
        );
      });

      // Marker detection events
      marker.addEventListener("markerFound", () => {
        if (markerFound) return; // Prevent duplicate events
        
        markerFound = true;
        updateDebug("🎯 Marker detected! Playing video...");
        
        // Show video and debug elements
        videoPlane.setAttribute("visible", "true");
        debugCube.setAttribute("visible", "true");
        
        // Play video
        if (video && videoLoaded) {
          video.currentTime = 0;
          video.muted = true; // Start muted for autoplay compatibility
          
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              updateDebug("✅ Video playing successfully");
              window.ReactNativeWebView?.postMessage(
                JSON.stringify({
                  type: "markerFound",
                  message: "Marker detected and video started",
                })
              );
            }).catch((e) => {
              updateDebug("❌ Video play failed: " + e.message);
              window.ReactNativeWebView?.postMessage(
                JSON.stringify({
                  type: "videoPlayError",
                  error: e.message,
                })
              );
            });
          }
        }
      });

      marker.addEventListener("markerLost", () => {
        markerFound = false;
        updateDebug("📍 Marker lost - searching...");
        
        // Hide video elements
        videoPlane.setAttribute("visible", "false");
        debugCube.setAttribute("visible", "false");
        
        // Pause video
        if (video && !video.paused) {
          video.pause();
        }

        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            type: "markerLost",
            message: "Marker lost",
          })
        );
      });

      // Scene initialization
      document.addEventListener('DOMContentLoaded', () => {
        updateDebug("DOM loaded, setting up AR overlay...");
        setTimeout(initializeAR, 1000);
      });

      // A-Frame scene loaded
      document.querySelector('a-scene').addEventListener('loaded', () => {
        updateDebug("✅ A-Frame scene loaded");
        
        // Test pattern file accessibility
        fetch("${markerData.patternUrl}")
          .then(response => {
            if (response.ok) {
              updateDebug("✅ Pattern file accessible");
            } else {
              updateDebug("⚠️ Pattern file issue: " + response.status);
            }
          })
          .catch(e => {
            updateDebug("❌ Pattern file error: " + e.message);
          });
      });
      
      // Status updates
      setInterval(() => {
        if (!sceneReady) {
          updateDebug("⏳ Initializing AR overlay...");
        } else if (markerFound && videoLoaded) {
          updateDebug("✅ AR active - video playing");
        } else if (!videoLoaded) {
          updateDebug("⏳ Loading video content...");
        } else {
          updateDebug("👀 Ready - point at marker image");
        }
      }, 3000);

      // Error handling
      window.addEventListener('error', (e) => {
        updateDebug("❌ Error: " + e.message);
        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            type: "globalError",
            message: e.message,
          })
        );
      });
    </script>
  </body>
</html>
`;

  const handleWebViewMessage = (event: any) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
      console.log('📨 AR WebView:', message);

      switch (message.type) {
        case 'debug':
          setDebugInfo(message.message || 'Debug info');
          break;
        case 'markerFound':
          console.log('🎯 AR Marker detected!');
          setDebugInfo('🎯 Marker detected! Video should be visible.');
          break;
        case 'markerLost':
          console.log('📍 AR Marker lost');
          setDebugInfo('📍 Searching for marker...');
          break;
        case 'videoPlayError':
        case 'videoError':
          console.error('❌ Video error:', message.error);
          setWebViewError(`Video Error: ${message.error}`);
          break;
        case 'globalError':
          console.error('❌ AR error:', message.message);
          setDebugInfo(`⚠️ AR Error: ${message.message}`);
          break;
      }
    } catch (e) {
      console.log('📨 Raw AR message:', event.nativeEvent.data);
    }
  };

  if (webViewError) {
    return (
      <ErrorHandler
        title="AR Experience Error"
        message={webViewError}
        onRetry={() => setWebViewError(null)}
        onCancel={onCancel}
        retryText="Try Again"
        cancelText="Back"
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* React Native Camera View */}
      {showCamera && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          autofocus="on"
        />
      )}
      
      {/* AR Overlay WebView */}
      <WebView
        key={`ar-overlay-${markerId}`}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}
        source={{ html: arHTML }}
        allowsInlineMediaPlaybook={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="compatibility"
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onLoad={() => {
          console.log('AR WebView loaded');
          setDebugInfo('AR overlay loaded...');
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('AR WebView error:', nativeEvent);
          setWebViewError(`AR Error: ${nativeEvent.description}`);
        }}
        onMessage={handleWebViewMessage}
      />
      
      {/* UI Overlay */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructions}>Point camera at your marker image</Text>
        <Text style={styles.subInstructions}>
          Keep the marker centered and well-lit
        </Text>
        <Text style={styles.debugInfo}>
          Marker: {markerId?.substring(0, 8)}...
        </Text>
        <Text style={styles.debugStatus}>
          {debugInfo}
        </Text>
      </View>
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.toggleButton} 
          onPress={() => setShowCamera(!showCamera)}
        >
          <Text style={styles.toggleButtonText}>
            {showCamera ? 'Hide Camera' : 'Show Camera'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  permissionText: {
    color: COLORS.text,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 5,
  },
  subInstructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 5,
  },
  debugInfo: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  debugStatus: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 12,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: `rgba(${parseInt(COLORS.primary.slice(1, 3), 16)}, ${parseInt(COLORS.primary.slice(3, 5), 16)}, ${parseInt(COLORS.primary.slice(5, 7), 16)}, 0.9)`,
    borderRadius: 10,
    padding: 15,
    flex: 1,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});