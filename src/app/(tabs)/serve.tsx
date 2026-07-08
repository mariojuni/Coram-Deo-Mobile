import { AssignmentCard } from '@/features/serve/presentation/components/AssignmentCard';
import { MinistryCard } from '@/features/serve/presentation/components/MinistryCard';
import { ServeCalendarView } from '@/features/serve/presentation/components/ServeCalendarView';
import { ServeEmptyState } from '@/features/serve/presentation/components/ServeEmptyState';
import { useMyAssignments } from '@/features/serve/presentation/hooks/useMyAssignments';
import { useServeMinistries } from '@/features/serve/presentation/hooks/useServeMinistries';
import { useAuthStore } from '@/store/useAuthStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { UserX } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = ['My Schedule', 'All Ministries', 'Calendar'] as const;
type ServeTab = (typeof TABS)[number];

export default function ServeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const [activeTab, setActiveTab] = useState<ServeTab>('My Schedule');

  const { grouped, allAssignments, loading: assignmentsLoading } =
    useMyAssignments();
  const { ministries, loading: ministriesLoading } = useServeMinistries();

  // Header height = safe area + title row (~54px) + pill row (~48px)
  const headerHeight = Math.max(insets.top, 24) + 110;

  const hasNoChurch =
    !userProfile?.churchId || userProfile?.status === 'pendingChurchLink';

  if (hasNoChurch) {
    return (
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF', '#EEF6FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View
          style={[
            styles.pendingContainer,
            { paddingTop: Math.max(insets.top, 24) },
          ]}
        >
          <View style={styles.pendingIconBox}>
            <UserX size={48} color="#FF6596" />
          </View>
          <Text style={styles.pendingTitle}>Not Linked to a Church</Text>
          <Text style={styles.pendingMessage}>
            Your account isn't linked to a church yet. Contact your church admin
            to get access to Serve.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ─── Frosted header ─── */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(255,255,255,0.6)' },
          ]}
          pointerEvents="none"
        />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Serve</Text>
          <Text style={styles.headerSubtitle}>Your ministry assignments</Text>
        </View>

        {/* ─── Tab pills ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
          style={styles.tabScrollWrapper}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ─── Content ─── */}
      {activeTab === 'My Schedule' && (
        <MyScheduleTab
          grouped={grouped}
          loading={assignmentsLoading}
          onPressAssignment={(id) =>
            router.push({ pathname: '/serve-assignment-detail', params: { id } } as any)
          }
          headerHeight={headerHeight}
        />
      )}
      {activeTab === 'All Ministries' && (
        <AllMinistriesTab
          ministries={ministries}
          loading={ministriesLoading}
          onPressMinistry={(id) =>
            router.push({ pathname: '/serve-ministry-detail', params: { id } } as any)
          }
          headerHeight={headerHeight}
        />
      )}
      {activeTab === 'Calendar' && (
        <CalendarTab
          assignments={allAssignments}
          onPressAssignment={(id) =>
            router.push({ pathname: '/serve-assignment-detail', params: { id } } as any)
          }
          headerHeight={headerHeight}
        />
      )}
    </View>
  );
}

// ─── My Schedule tab ──────────────────────────────────────────────────────────

function MyScheduleTab({
  grouped,
  loading,
  onPressAssignment,
  headerHeight,
}: {
  grouped: ReturnType<typeof useMyAssignments>['grouped'];
  loading: boolean;
  onPressAssignment: (id: string) => void;
  headerHeight: number;
}) {
  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: headerHeight + 40 }]}>
        <ActivityIndicator color="#FF6596" />
      </View>
    );
  }

  if (!grouped.length) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
      >
        <ServeEmptyState
          title="No Assignments Yet"
          message="When your ministry leader schedules you, your assignments will appear here."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {grouped.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupOverline}>{group.label.toUpperCase()}</Text>
          {group.data.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onPress={() => onPressAssignment(a.id)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// ─── All Ministries tab ───────────────────────────────────────────────────────

function AllMinistriesTab({
  ministries,
  loading,
  onPressMinistry,
  headerHeight,
}: {
  ministries: ReturnType<typeof useServeMinistries>['ministries'];
  loading: boolean;
  onPressMinistry: (id: string) => void;
  headerHeight: number;
}) {
  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: headerHeight + 40 }]}>
        <ActivityIndicator color="#FF6596" />
      </View>
    );
  }

  if (!ministries.length) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
      >
        <ServeEmptyState
          title="No Ministries Found"
          message="Your church hasn't set up any ministries yet. Check back soon."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {ministries.map((m) => (
        <MinistryCard key={m.id} ministry={m} onPress={() => onPressMinistry(m.id)} />
      ))}
    </ScrollView>
  );
}

// ─── Calendar tab ─────────────────────────────────────────────────────────────

function CalendarTab({
  assignments,
  onPressAssignment,
  headerHeight,
}: {
  assignments: ReturnType<typeof useMyAssignments>['allAssignments'];
  onPressAssignment: (id: string) => void;
  headerHeight: number;
}) {
  return (
    <View style={[styles.calendarContainer, { paddingTop: headerHeight + 16 }]}>
      <ServeCalendarView
        assignments={assignments}
        onPressAssignment={(a) => onPressAssignment(a.id)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },

  // Frosted header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Tab pills
  tabScrollWrapper: { flexGrow: 0 },
  tabScroll: {
    paddingHorizontal: 24,
    paddingBottom: 14,
    gap: 16,
    flexDirection: 'row',
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  tabPillActive: {
    backgroundColor: '#FF6596',
    borderColor: '#FF6596',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Content
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { marginBottom: 4 },
  groupOverline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
  },
  calendarContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // No church state
  pendingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  pendingIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 6,
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },
});
