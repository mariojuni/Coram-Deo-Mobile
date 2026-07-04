import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export function AuthGeometricHeader() {
  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#FFE8F1', '#F5F2FF', '#EEF6FF']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={StyleSheet.absoluteFill}
      />
      
      {/* Background Shapes */}
      {/* Top Left Circle */}
      <View style={[styles.shape, styles.circle, { top: -60, left: -40, width: 200, height: 200, backgroundColor: '#FF6596', opacity: 0.8 }]} />
      
      {/* Top Right Semi-Circle */}
      <View style={[styles.shape, { top: -20, right: -60, width: 160, height: 160, borderRadius: 80, borderTopLeftRadius: 0, backgroundColor: '#B66DFF', opacity: 0.9, transform: [{ rotate: '45deg' }] }]} />
      
      {/* Bottom Left Square/Leaf */}
      <View style={[styles.shape, { bottom: 20, left: -30, width: 120, height: 120, borderTopRightRadius: 60, borderBottomLeftRadius: 60, backgroundColor: '#F59E0B', opacity: 0.85 }]} />
      
      {/* Bottom Right Circle */}
      <View style={[styles.shape, styles.circle, { bottom: -40, right: -20, width: 140, height: 140, backgroundColor: '#4D8BFF', opacity: 0.75 }]} />
      
      {/* Center Blob */}
      <View style={[styles.shape, { top: 60, left: width / 2 - 50, width: 100, height: 100, borderTopLeftRadius: 50, borderBottomRightRadius: 50, backgroundColor: '#10B981', opacity: 0.85 }]} />
      
      {/* Frosted Glass Blur Effect */}
      <BlurView intensity={15} tint="light" style={StyleSheet.absoluteFill} />

      {/* Overlay to soften the pattern slightly into the white background */}
      <LinearGradient 
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', '#ffffff']} 
        start={{ x: 0.5, y: 0.3 }} 
        end={{ x: 0.5, y: 1 }} 
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  shape: {
    position: 'absolute',
  },
  circle: {
    borderRadius: 999,
  },
});
