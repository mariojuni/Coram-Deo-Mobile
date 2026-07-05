import type { BiblePlan, UserBiblePlan } from '@/features/biblePlan/domain/biblePlan.types';
import { useAuthStore } from '@/store/useAuthStore';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Pick the most recently read active plan
function pickActivePlan(plans: UserBiblePlan[]): UserBiblePlan | null {
  const active = plans.filter((p) => p.status === 'active');
  if (active.length === 0) return null;
  return active.sort((a, b) => {
    const aTime = a.lastReadAt ? new Date(a.lastReadAt as string).getTime() : 0;
    const bTime = b.lastReadAt ? new Date(b.lastReadAt as string).getTime() : 0;
    return bTime - aTime; // most recently read first
  })[0];
}

export function BiblePlanProgressCard() {
  const router = useRouter();
  const userBiblePlans = useBiblePlanStore((s) => s.userBiblePlans);
  const userBiblePlansLoading = useBiblePlanStore((s) => s.userBiblePlansLoading);
  const plans = useBiblePlanStore((s) => s.plans);
  const initializePlansListener = useBiblePlanStore((s) => s.initializePlansListener);
  const initializeUserBiblePlansListener = useBiblePlanStore((s) => s.initializeUserBiblePlansListener);
  const currentUser = useAuthStore((s) => s.currentUser);
  const userProfile = useAuthStore((s) => s.userProfile);

  useEffect(() => {
    const churchId = userProfile?.churchId;
    const userId = currentUser?.uid;
    if (!churchId || !userId) return;
    const unsubPlans = initializePlansListener(churchId);
    const unsubUserPlans = initializeUserBiblePlansListener(userId, churchId);
    return () => { unsubPlans(); unsubUserPlans(); };
  }, [userProfile?.churchId, currentUser?.uid, initializePlansListener, initializeUserBiblePlansListener]);

  const activePlan = pickActivePlan(userBiblePlans);
  const planMeta: BiblePlan | undefined = plans.find((p) => p.id === activePlan?.planId);

  if (userBiblePlansLoading) return null;

  // ── No active plan ────────────────────────────────────────────────────────
  if (!activePlan) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.emptyCard}
        onPress={() => router.push('/bible-plans')}
      >
        <LinearGradient
          colors={['#FFF0F5', '#F5F0FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyGradient}
        >
          <View style={styles.emptyIconWrap}>
            <Sparkles size={22} color="#C084FC" strokeWidth={2} />
          </View>
          <View style={styles.emptyText}>
            <Text style={styles.emptyTitle}>Start a Bible Reading Plan</Text>
            <Text style={styles.emptySubtitle}>Build a daily habit with guided plans</Text>
          </View>
          <ChevronRight size={18} color="#C9A8E0" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // ── Active plan ───────────────────────────────────────────────────────────
  const progress = Math.min(activePlan.progressPercentage ?? 0, 100);
  console.log('[BiblePlanProgressCard] activePlan.planId:', activePlan.planId, '| planMeta:', planMeta?.id);
  const dayLabel = `Day ${activePlan.currentDayNumber} of ${activePlan.totalDays}`;
  const title = planMeta?.title ?? 'Bible Reading Plan';
  const hasMorePlans = plans.length > 1;

  return (
    <View style={styles.activeWrapper}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/bible-plans/${activePlan.planId}`)}
      >
        <View style={styles.card}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.stripe}
          />
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={['#FF6596', '#B66DFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <BookOpen size={18} color="#fff" strokeWidth={2} />
            </LinearGradient>
          </View>
          <View style={styles.content}>
            <View style={styles.topRow}>
              <Text style={styles.overline}>BIBLE PLAN</Text>
              <Text style={styles.dayLabel}>{dayLabel}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <View style={styles.track}>
              <LinearGradient
                colors={['#F9A8C9', '#D8B4FE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.fill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressLabel}>{Math.round(progress)}% complete</Text>
          </View>
          <ChevronRight size={16} color="#C0C0C0" strokeWidth={2.5} style={styles.chevron} />
        </View>
      </TouchableOpacity>

      {hasMorePlans && (
        <TouchableOpacity
          style={styles.seeAllRow}
          activeOpacity={0.7}
          onPress={() => router.push('/bible-plans')}
        >
          <Text style={styles.seeAllText}>See all plans</Text>
          <ChevronRight size={14} color="#FF6596" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Empty state ──────────────────────────────────────────────────────────
  emptyCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(192,132,252,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { flex: 1 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  emptySubtitle: { fontSize: 12, color: '#888' },

  // ── Active plan card ─────────────────────────────────────────────────────
  activeWrapper: {
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    paddingRight: 14,
  },
  stripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWrap: {
    marginLeft: 14,
    marginRight: 12,
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  overline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.2,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
    marginBottom: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 8,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6596',
  },
});
