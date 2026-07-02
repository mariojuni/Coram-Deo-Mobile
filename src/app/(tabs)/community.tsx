import { BlurView } from 'expo-blur';
import {
    CalendarDays,
    HeartHandshake,
    PlayCircle,
    Users,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Sub-tab definitions ──────────────────────────────────────────────────────
const TABS = [
  { label: 'Prayer Wall', icon: HeartHandshake },
  { label: 'Events', icon: CalendarDays },
  { label: 'Sermons', icon: PlayCircle },
  { label: 'Members', icon: Users },
] as const;

type TabIndex = 0 | 1 | 2 | 3;

// ─── Placeholder sub-screen components ───────────────────────────────────────

function PrayerWallTab() {
  return (
    <View style={placeholder.wrap}>
      <View style={[placeholder.icon, { backgroundColor: '#FFE8F0' }]}>
        <HeartHandshake size={32} color="#FF6596" />
      </View>
      <Text style={placeholder.title}>Prayer Wall</Text>
      <Text style={placeholder.subtitle}>
        Share and lift up prayer requests with your community.
      </Text>
    </View>
  );
}

function EventsTab() {
  return (
    <View style={placeholder.wrap}>
      <View style={[placeholder.icon, { backgroundColor: '#E8F0FF' }]}>
        <CalendarDays size={32} color="#4D8BFF" />
      </View>
      <Text style={placeholder.title}>Events</Text>
      <Text style={placeholder.subtitle}>
        Upcoming services, gatherings, and church activities.
      </Text>
    </View>
  );
}

function SermonsTab() {
  return (
    <View style={placeholder.wrap}>
      <View style={[placeholder.icon, { backgroundColor: '#F0E8FF' }]}>
        <PlayCircle size={32} color="#9B6DFF" />
      </View>
      <Text style={placeholder.title}>Sermons</Text>
      <Text style={placeholder.subtitle}>
        Watch and listen to recent messages from the pulpit.
      </Text>
    </View>
  );
}

function MembersTab() {
  return (
    <View style={placeholder.wrap}>
      <View style={[placeholder.icon, { backgroundColor: '#E8FFF0' }]}>
        <Users size={32} color="#4ADE80" />
      </View>
      <Text style={placeholder.title}>Member Directory</Text>
      <Text style={placeholder.subtitle}>
        Connect with fellow members of the congregation.
      </Text>
    </View>
  );
}

const SUB_SCREENS = [PrayerWallTab, EventsTab, SermonsTab, MembersTab];

// ─── Main Community screen ────────────────────────────────────────────────────

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabIndex>(0);

  // Per-tab measured layout { x, width }
  const tabLayouts = useRef<Array<{ x: number; width: number } | null>>(
    Array(TABS.length).fill(null),
  );
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const initialised = useRef(false);

  const handleTabLayout = (index: number, x: number, width: number) => {
    tabLayouts.current[index] = { x, width };
    // Seed the indicator on first layout of the default tab
    if (index === 0 && !initialised.current) {
      indicatorX.setValue(x);
      indicatorWidth.setValue(width);
      initialised.current = true;
    }
  };

  const handleTabPress = (index: TabIndex) => {
    const layout = tabLayouts.current[index];
    if (layout) {
      Animated.parallel([
        Animated.spring(indicatorX, {
          toValue: layout.x,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }),
        Animated.spring(indicatorWidth, {
          toValue: layout.width,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }),
      ]).start();
    }
    setActiveTab(index);
  };

  const ActiveScreen = SUB_SCREENS[activeTab];
  const headerHeight = Math.max(insets.top, 24) + 120;

  return (
    <View style={styles.container}>
      {/* ── Frosted sticky header ── */}
      <View
        style={[styles.frostedHeader, { paddingTop: Math.max(insets.top, 24) }]}
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

        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Community</Text>
        </View>

        {/* Underline tab bar */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
          >
            {TABS.map(({ label }, index) => (
              <TouchableOpacity
                key={label}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  handleTabLayout(index, x, width);
                }}
                onPress={() => handleTabPress(index as TabIndex)}
                style={styles.tab}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === index && styles.tabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Sliding underline indicator */}
            <Animated.View
              style={[
                styles.indicator,
                { left: indicatorX, width: indicatorWidth },
              ]}
            />
          </ScrollView>
        </View>
      </View>

      {/* ── Sub-screen content ── */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: headerHeight }]}
      >
        <ActiveScreen />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    paddingBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },

  // ── Tab bar ───
  tabBarWrapper: {
    paddingBottom: 0,
  },
  tabBarContent: {
    paddingHorizontal: 24,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    letterSpacing: 0.1,
  },
  tabTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },

  // Sliding indicator
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#FF6596',
  },

  content: {
    flexGrow: 1,
    paddingBottom: 120,
  },
});

// ─── Placeholder shared styles ────────────────────────────────────────────────

const placeholder = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 16,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
