import { BlurView } from 'expo-blur';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

export interface TopNavBarProps {
  leftText: string;
  onLeftPress: () => void;
  onRightPress: () => void;
  rightText: string;
}

export function TopNavBar({ leftText, onLeftPress, rightText, onRightPress }: TopNavBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />

      <View style={styles.content}>
        <View style={styles.pillContainer}>
          <TouchableOpacity style={styles.bookBtn} onPress={onLeftPress}>
            <Text style={styles.bookText}>{leftText}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.versionBtn} onPress={onRightPress}>
            <Text style={styles.versionText}>{rightText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    overflow: 'hidden',
  },
  content: {
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillContainer: {
    ...getTopBarButtonShadowStyle(30),
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
});
