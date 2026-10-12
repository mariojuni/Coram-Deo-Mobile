import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStore } from '@/store/useNetworkStore';

interface OfflineBannerProps {
  customMessage?: string;
  style?: any;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  customMessage = 'Offline Mode • Reading from local storage',
  style,
}) => {
  const isConnected = useNetworkStore((state) => state.isConnected);
  const isInitialized = useNetworkStore((state) => state.isInitialized);

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-12)).current;

  const isOffline = isInitialized && !isConnected;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: isOffline ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: isOffline ? 0 : -12,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOffline, opacityAnim, translateYAnim]);

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateYAnim }],
        },
        style,
      ]}
      pointerEvents="none"
    >
      <View style={styles.badge}>
        <WifiOff size={13} color="#FFFFFF" strokeWidth={2.2} style={styles.icon} />
        <Text style={styles.text}>{customMessage}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    zIndex: 90,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151', // Sleek slate charcoal
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: '#F9FAFB',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default OfflineBanner;
