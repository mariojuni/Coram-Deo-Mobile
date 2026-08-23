import { BlurView } from 'expo-blur';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSoftShadowStyle, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { LinearGradient } from 'expo-linear-gradient';
import DebouncedTouchable from '@/components/DebouncedTouchable';

export interface TopNavBarProps {
  leftText: string;
  onLeftPress: () => void;
  onRightPress: () => void;
  rightText: string;
  scrollY?: Animated.Value;
  showSplitIcon?: boolean;
  isSplitMode?: boolean;
  onSplitPress?: () => void;
  secondaryRightText?: string;
  onSecondaryRightPress?: () => void;
}

import { Columns } from 'lucide-react-native';

const COLLAPSE_RANGE = 70;

export function TopNavBar({ 
  leftText, 
  onLeftPress, 
  rightText, 
  onRightPress, 
  scrollY,
  showSplitIcon,
  isSplitMode,
  onSplitPress,
  secondaryRightText,
  onSecondaryRightPress
}: TopNavBarProps) {
  const insets = useSafeAreaInsets();

  const pillScale = scrollY ? scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  }) : 1;

  const accentLineOpacity = scrollY ? scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [1, 0],
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
        <Animated.View 
          style={[
            styles.pillContainer, 
            { transform: [{ scale: pillScale }] }
          ]} 
          pointerEvents="box-none"
        >
          {isSplitMode && (
            <>
              <DebouncedTouchable style={styles.versionBtn} onPress={onRightPress}>
                <Text style={styles.versionText}>{rightText}</Text>
              </DebouncedTouchable>
              <View style={styles.divider} />
            </>
          )}

          <DebouncedTouchable style={styles.bookBtn} onPress={onLeftPress}>
            <Text style={styles.bookText}>{leftText}</Text>
          </DebouncedTouchable>

          <View style={styles.divider} />

          {isSplitMode ? (
            !!(secondaryRightText && onSecondaryRightPress) && (
              <DebouncedTouchable style={styles.versionBtn} onPress={onSecondaryRightPress}>
                <Text style={styles.versionText}>{secondaryRightText}</Text>
              </DebouncedTouchable>
            )
          ) : (
            <DebouncedTouchable style={styles.versionBtn} onPress={onRightPress}>
              <Text style={styles.versionText}>{rightText}</Text>
            </DebouncedTouchable>
          )}
        </Animated.View>
        
        {/* Right side icons */}
        {!!showSplitIcon ? (
          <View style={[styles.rightActions, { right: Math.max(insets.right, 16) }]}>
            <DebouncedTouchable style={[styles.splitBtn, isSplitMode && styles.splitBtnActive]} onPress={onSplitPress}>
              <Columns size={20} color={isSplitMode ? "#FFFFFF" : "#4B5563"} />
            </DebouncedTouchable>
          </View>
        ) : null}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
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
  splitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  splitBtnActive: {
    backgroundColor: '#FF6596',
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
