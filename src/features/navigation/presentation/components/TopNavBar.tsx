import { BlurView } from 'expo-blur';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSoftShadowStyle, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { LinearGradient } from 'expo-linear-gradient';
import DebouncedTouchable from '@/components/DebouncedTouchable';

export interface TopNavBarProps {
  leftText: string;
  onLeftPress?: () => void;
  onRightPress: () => void;
  rightText: string;
  scrollY?: Animated.Value;
  showSplitIcon?: boolean;
  isSplitMode?: boolean;
  onSplitPress?: () => void;
  secondaryRightText?: string;
  onSecondaryRightPress?: () => void;
  showActivityIcon?: boolean;
  onActivityPress?: () => void;
  onBackPress?: () => void;
  showFontIcon?: boolean;
  onFontPress?: () => void;
}

import { Columns, Activity, ChevronLeft } from 'lucide-react-native';
import { BounceCard } from '@/components/ui/BounceCard';
import InfoMenuIcon from '@/components/Navigation/Icons/InfoMenuIcon';

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
  onSecondaryRightPress,
  showActivityIcon,
  onActivityPress,
  onBackPress,
  showFontIcon,
  onFontPress
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
        {/* Left side back button */}
        {!!onBackPress && (
          <View style={[styles.leftActions, { left: Math.max(insets.left, 20) }]}>
            <BounceCard bounceScale={0.85} style={styles.backCircle} onPress={onBackPress} hitSlop={8}>
              <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
            </BounceCard>
          </View>
        )}

        <Animated.View 
          style={[
            styles.pillContainer, 
            { transform: [{ scale: pillScale }] }
          ]} 
          pointerEvents="box-none"
        >
          {isSplitMode ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DebouncedTouchable style={styles.versionBtn} onPress={onRightPress}>
                <Text style={styles.versionText}>{rightText}</Text>
              </DebouncedTouchable>

              <View style={styles.divider} />

              <DebouncedTouchable style={styles.bookBtn} onPress={onLeftPress} disabled={!onLeftPress}>
                <Text style={styles.bookText}>{leftText}</Text>
              </DebouncedTouchable>

              {!!(secondaryRightText && onSecondaryRightPress) ? (
                <>
                  <View style={styles.divider} />
                  <DebouncedTouchable style={styles.versionBtn} onPress={onSecondaryRightPress}>
                    <Text style={styles.versionText}>{secondaryRightText}</Text>
                  </DebouncedTouchable>
                </>
              ) : null}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DebouncedTouchable style={styles.bookBtn} onPress={onLeftPress} disabled={!onLeftPress}>
                <Text style={styles.bookText}>{leftText}</Text>
              </DebouncedTouchable>

              <View style={styles.divider} />

              <DebouncedTouchable style={styles.versionBtn} onPress={onRightPress}>
                <Text style={styles.versionText}>{rightText}</Text>
              </DebouncedTouchable>
            </View>
          )}
        </Animated.View>
        
        {/* Right side icons */}
        <View style={[styles.rightActions, { right: Math.max(insets.right, 20) }]}>
          {!!showActivityIcon && (
            <DebouncedTouchable style={styles.actionBtn} onPress={onActivityPress}>
              <Activity size={22} color="#4B5563" />
            </DebouncedTouchable>
          )}
          {!!showFontIcon && (
            <DebouncedTouchable style={styles.actionBtn} onPress={onFontPress}>
              <InfoMenuIcon size={24} color="#4B5563" />
            </DebouncedTouchable>
          )}
          {!!showSplitIcon && (
            <DebouncedTouchable style={[styles.splitBtn, isSplitMode && styles.splitBtnActive]} onPress={onSplitPress}>
              <Columns size={20} color={isSplitMode ? "#FFFFFF" : "#4B5563"} />
            </DebouncedTouchable>
          )}
        </View>
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
    right: 20,
    top: 0,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
  leftActions: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
