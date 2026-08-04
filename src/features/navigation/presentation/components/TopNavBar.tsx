import { BlurView } from 'expo-blur';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSoftShadowStyle, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { LinearGradient } from 'expo-linear-gradient';

export interface TopNavBarProps {
  leftText: string;
  onLeftPress: () => void;
  onRightPress: () => void;
  rightText: string;
  scrollY?: Animated.Value;
}

const COLLAPSE_RANGE = 70;

export function TopNavBar({ leftText, onLeftPress, rightText, onRightPress, scrollY }: TopNavBarProps) {
  const insets = useSafeAreaInsets();

  const expandedOpacity = scrollY ? scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  }) : 1;

  const compactOpacity = scrollY ? scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  }) : 0;

  const accentLineOpacity = scrollY ? scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [1, 0.4],
    extrapolate: 'clamp',
  }) : 1;

  const headerPaddingTop = scrollY ? scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [Math.max(insets.top, 24), Math.max(insets.top - 10, 10)],
    extrapolate: 'clamp',
  }) : Math.max(insets.top, 24);

  return (
    <Animated.View style={[styles.headerContainer, { paddingTop: headerPaddingTop }]} pointerEvents="box-none">
      <BlurView intensity={80} tint="light" style={[StyleSheet.absoluteFill, { top: -150 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)', top: -150 }]} pointerEvents="none" />

      {/* Gradient accent line at top */}
      <Animated.View style={[styles.accentLine, { opacity: accentLineOpacity }]}>
        <LinearGradient
          colors={['#FF6596', '#B66DFF', '#6DC8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.content} pointerEvents="box-none">
        
        {/* Expanded (Centered) */}
        <Animated.View style={[styles.pillContainer, { opacity: expandedOpacity }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.bookBtn} onPress={onLeftPress}>
            <Text style={styles.bookText}>{leftText}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.versionBtn} onPress={onRightPress}>
            <Text style={styles.versionText}>{rightText}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Compact (Left Aligned) */}
        <Animated.View style={[styles.compactContainer, { opacity: compactOpacity }]} pointerEvents="box-none">
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={styles.compactBookBtn} onPress={onLeftPress}>
            <Text style={styles.compactBookText}>{leftText}</Text>
          </TouchableOpacity>

          <View style={styles.compactDivider} />

          <TouchableOpacity style={styles.compactVersionBtn} onPress={onRightPress}>
            <Text style={styles.compactVersionText}>{rightText}</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    overflow: 'visible',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
  },
  content: {
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52, // enough height so absolute children fit nicely
  },
  pillContainer: {
    ...getSoftShadowStyle(30),
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  bookBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bookText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#e1e4e8',
    marginHorizontal: 4,
  },
  versionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 101, 150, 0.08)',
    borderRadius: 20,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6596',
    textTransform: 'uppercase',
  },
  compactContainer: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  compactBookBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  compactBookText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  compactDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e1e4e8',
    marginHorizontal: 4,
  },
  compactVersionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 101, 150, 0.08)',
    borderRadius: 16,
  },
  compactVersionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    textTransform: 'uppercase',
  },
});
