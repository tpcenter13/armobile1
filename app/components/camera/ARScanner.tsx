// components/camera/ARScanner.tsx
import { CameraView } from 'expo-camera';
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
  const [webViewError, setWebViewError] = React.useState<string | null>(null);

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

  const arHTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>AR Marker Video Viewer</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/ar.js@3.4.2/aframe/build/aframe-ar.min.js"></script>
  </head>
  <body style="margin: 0; overflow: hidden;">
    <a-scene
      embedded
      vr-mode-ui="enabled: false"
      renderer="logarithmicDepthBuffer: true;"
      arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false;"
    >
      <!-- Pattern Marker -->
      <a-marker
        id="marker"
        type="pattern"
        preset="custom"
        url="${markerData.patternUrl}"
        raycaster="objects: .clickable"
        emitevents="true"
      >
        <!-- Assets (video element) -->
        <a-assets>
          <video
            id="ar-video"
            src="${markerData.videoUrl}"
            preload="auto"
            crossorigin="anonymous"
            playsinline
            webkit-playsinline
            autoplay="false"
            loop
          ></video>
        </a-assets>

        <!-- Plane for video, initially hidden -->
        <a-plane
          id="video-plane"
          visible="false"
          position="0 0 0.01"
          rotation="-90 0 0"
          width="2"
          height="1.5"
          material="src: #ar-video; transparent: true; alphaTest: 0.5; opacity: 1; shader: flat;"
          animation__found="property: scale; to: 1.1 1.1 1.1; startEvents: markerFound; dur: 300; easing: easeOutCubic"
          animation__lost="property: scale; to: 1 1 1; startEvents: markerLost; dur: 300; easing: easeInCubic"
        ></a-plane>
      </a-marker>

      <!-- Camera -->
      <a-entity camera></a-entity>
    </a-scene>

    <script>
      const marker = document.querySelector("#marker");
      const video = document.querySelector("#ar-video");
      const videoPlane = document.querySelector("#video-plane");

      marker.addEventListener("markerFound", () => {
        console.log("🎯 Pattern marker found!");
        videoPlane.setAttribute("visible", "true");

        if (video && video.paused) {
          video.currentTime = 0;
          video.play().then(() => {
            console.log("✅ Video started playing");
            window.ReactNativeWebView?.postMessage(
              JSON.stringify({
                type: "markerFound",
                message: "Pattern marker detected and video started",
              })
            );
          }).catch((e) => {
            console.error("❌ Video play failed:", e);
            window.ReactNativeWebView?.postMessage(
              JSON.stringify({
                type: "videoAutoPlayFailed",
                error: e.message,
              })
            );
          });
        }
      });

      marker.addEventListener("markerLost", () => {
        console.log("❌ Pattern marker lost");
        videoPlane.setAttribute("visible", "false");

        if (video && !video.paused) {
          video.pause();
        }

        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            type: "markerLost",
            message: "Pattern marker lost",
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
      console.log('📨 WebView message:', message);

      switch (message.type) {
        case 'markerFound':
          console.log('🎯 Marker detected!', message.message);
          break;
        case 'markerLost':
          console.log('❌ Marker lost:', message.message);
          break;
        case 'videoAutoPlayFailed':
          console.log('❌ Video autoplay failed:', message.error);
          break;
        case 'videoError':
          console.error('❌ Video error:', message);
          setWebViewError(`Video Error: ${message.error}`);
          break;
        case 'initializationError':
          console.error('❌ AR initialization error:', message);
          setWebViewError(`Initialization Error: ${message.message}`);
          break;
        case 'globalError':
          console.error('❌ Global AR error:', message);
          setWebViewError(`AR Error: ${message.message}`);
          break;
        case 'videoLoaded':
          console.log('✅ Video loaded successfully');
          break;
      }
    } catch (e) {
      console.log('📨 WebView raw message:', event.nativeEvent.data);
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
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
      
      <WebView
        key={`webview-${markerId}`}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}
        source={{ html: arHTML }}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        mixedContentMode="compatibility"
        allowsAccessToCamera={true}
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
        cacheEnabled={false}
        incognito={true}
        onLoad={() => console.log('WebView loaded successfully')}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView error:', nativeEvent);
          setWebViewError(`WebView Error: ${nativeEvent.description || 'Unknown error'}`);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView HTTP error:', nativeEvent);
          setWebViewError(`HTTP Error: ${nativeEvent.statusCode} - ${nativeEvent.description}`);
        }}
        onMessage={handleWebViewMessage}
      />
      
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructions}>Point camera at your marker image</Text>
        <Text style={styles.subInstructions}>
          Keep the marker image centered and well-lit
        </Text>
        <Text style={styles.debugInfo}>
          Marker ID: {markerId?.substring(0, 8)}...
        </Text>
      </View>
      
      <TouchableOpacity style={styles.backButton} onPress={onCancel}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 150,
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
  },
  debugInfo: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  backButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: `rgba(${parseInt(COLORS.primary.slice(1, 3), 16)}, ${parseInt(COLORS.primary.slice(3, 5), 16)}, ${parseInt(COLORS.primary.slice(5, 7), 16)}, 0.9)`,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});