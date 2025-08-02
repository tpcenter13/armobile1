import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import LoadingSpinner from '../ui/LoadingSpinner';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MarkerData {
  imageUrl: string;
  videoUrl: string;
  patternUrl: string;
}

interface WebViewARProps {
  markerData: MarkerData;
  onError: (error: string) => void;
  onBackPress: () => void;
}

const WebViewAR: React.FC<WebViewARProps> = ({
  markerData,
  onError,
  onBackPress,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateARHTML = () => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>AR Viewer</title>
  <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar-nft.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
    }

    #arjs-video {
      object-fit: cover;
      width: 100vw !important;
      height: 100vh !important;
      position: absolute;
      top: 0;
      left: 0;
      z-index: -2;
    }

    a-scene {
      width: 100vw;
      height: 100vh;
    }

    .loading {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }

    .error {
      background: rgba(255,0,0,0.8);
    }
  </style>
</head>
<body>
  <div id="loading" class="loading">
    <div>Loading AR...</div>
    <div style="font-size: 12px; margin-top: 10px;">Point camera at marker</div>
  </div>

  <div id="error" class="loading error" style="display: none;">
    <div>AR Error</div>
    <div style="font-size: 12px; margin-top: 10px;">Failed to initialize AR</div>
  </div>

  <a-scene
    arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
    vr-mode-ui="enabled: false"
    renderer="logarithmicDepthBuffer: true; colorManagement: true; sortObjects: true;"
    embedded
    id="scene"
  >
    <a-assets timeout="30000">
      <a-asset-item id="pattern" src="${markerData.patternUrl}"></a-asset-item>
      <video
        id="video"
        src="${markerData.videoUrl}"
        preload="auto"
        crossorigin="anonymous"
        playsinline
        webkit-playsinline
        autoplay
        muted
        loop
      ></video>
    </a-assets>

    <a-marker
      type="pattern"
      url="${markerData.patternUrl}"
      id="marker"
      registerevents
      smooth="true"
      smoothCount="10"
      smoothTolerance=".01"
      smoothThreshold="5"
    >
      <a-video
        src="#video"
        width="2"
        height="1.5"
        position="0 0.5 0"
        rotation="-90 0 0"
        material="shader: flat; transparent: true; alphaTest: 0.1;"
        gesture-handler="minScale: 0.25; maxScale: 10"
      ></a-video>
    </a-marker>

    <a-entity camera look-controls-enabled="false"></a-entity>
  </a-scene>

  <script>
    let videoElement = null;
    let markerFound = false;

    document.addEventListener('DOMContentLoaded', function () {
      const scene = document.querySelector('a-scene');
      const marker = document.querySelector('#marker');
      const loading = document.getElementById('loading');
      const error = document.getElementById('error');

      function showError(message) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.innerHTML = '<div>AR Error</div><div style="font-size: 12px; margin-top: 10px;">' + message + '</div>';
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message }));
        }
      }

      function setupAR() {
        videoElement = document.getElementById('video');

        if (!videoElement) {
          showError('Video element not found');
          return;
        }

        marker.addEventListener('markerFound', function () {
          markerFound = true;
          loading.style.display = 'none';

          // Make video visible and play
          videoElement.style.display = 'block';
          videoElement.play().catch(e => console.warn('Video play failed:', e));

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerFound' }));
          }
        });

        marker.addEventListener('markerLost', function () {
          markerFound = false;
          videoElement.pause();
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerLost' }));
          }
        });

        // Retry message if marker is not found in 5 sec
        setTimeout(() => {
          if (!markerFound && loading.style.display !== 'none') {
            loading.innerHTML = '<div>Point camera at marker</div><div style="font-size: 12px; margin-top: 10px;">Make sure marker is well lit and in view</div>';
          }
        }, 5000);

        // Notify React Native
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'arReady' }));
        }
      }

      if (scene.hasLoaded) {
        setupAR();
      } else {
        scene.addEventListener('loaded', setupAR);
      }

      document.addEventListener('visibilitychange', function () {
        if (videoElement) {
          if (document.hidden) {
            videoElement.pause();
          } else if (markerFound) {
            videoElement.play().catch(e => console.warn('Video resume failed:', e));
          }
        }
      });

      window.addEventListener('error', function (e) {
        console.error('Global error:', e.error);
        showError('Unexpected error occurred');
      });
    });
  </script>
</body>
</html>`;
};


  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'arReady':
          console.log('AR ready');
          setIsLoading(false);
          break;
        
        case 'markerFound':
          console.log('Marker found in WebView');
          break;
        
        case 'markerLost':
          console.log('Marker lost in WebView');
          break;
        
        case 'error':
          console.error('AR error:', message.message);
          setError(message.message);
          onError(message.message);
          break;
        
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (e) {
      console.error('Failed to parse WebView message:', e);
    }
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError('WebView failed to load');
    onError('WebView failed to load');
  };

  const handleWebViewLoad = () => {
    console.log('WebView loaded successfully');
    // Keep loading state until AR is ready
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>AR Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onBackPress}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateARHTML() }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        onError={handleWebViewError}
        onLoad={handleWebViewLoad}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        cacheEnabled={false}
        incognito={true}
        startInLoadingState={false}
        renderLoading={() => <LoadingSpinner />}
      />
      
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Initializing AR...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WebViewAR;