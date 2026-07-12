import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SermonsExperience } from '@/features/sermons/presentation/components/SermonsExperience';
import { useAuthStore } from '@/store/useAuthStore';

const NAVY = '#1A1A1A';
const BEIGE = '#FAFAFA';
const GOLD = '#FF6596';

export default function SermonsTab() {
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);

  // Guard: no churchId = nothing to show
  if (!userProfile?.churchId || userProfile?.status === 'pendingChurchLink' || userProfile?.status === 'disabled') {
    return (
      <View style={[styles.guard, { paddingTop: insets.top }]}>
        <Text style={styles.guardTitle}>Sermons</Text>
        <Text style={styles.guardText}>
          Your account isn't linked to a church yet. Contact your church admin to get access.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sermons</Text>
        <Text style={styles.headerSubtitle}>Messages from the pulpit</Text>
      </View>

      {/* Main content */}
      <SermonsExperience showSearchInput={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BEIGE,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE3',
    backgroundColor: BEIGE,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: GOLD,
    fontWeight: '600',
    marginTop: 1,
  },
  guard: {
    flex: 1,
    backgroundColor: BEIGE,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  guardTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: NAVY,
  },
  guardText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
});
