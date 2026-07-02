import { BottomTabInset } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SermonsExperience } from '../components/SermonsExperience';

export function SermonListScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 24);
  const headerHeight = topInset + 90;

  return (
    <View style={styles.container}>
      <View style={[styles.frostedHeader, { paddingTop: topInset }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.6)' }]} pointerEvents="none" />

        <View style={styles.titleRow}>
          <Text style={styles.title}>Sermons</Text>
          <Text style={styles.subtitle}>Library and teaching archive</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: headerHeight, paddingBottom: BottomTabInset + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <SermonsExperience />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  frostedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  titleRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
  },
});
