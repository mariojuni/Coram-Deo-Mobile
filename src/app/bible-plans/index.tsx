import type { BiblePlan } from '@/features/biblePlan/domain/biblePlan.types';
import { useBiblePlans } from '@/features/biblePlan/presentation/hooks/useBiblePlans';
import { useUserBiblePlans } from '@/features/biblePlan/presentation/hooks/useUserBiblePlans';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#FF6596';
const SECONDARY = '#B66DFF';
const GRADIENT = [PRIMARY, SECONDARY] as const;
const BACKGROUND = '#FAFAFA';

interface ExplorePlanCardProps {
  plan: BiblePlan;
  isStarted: boolean;
  progressPercentage?: number;
  currentDayNumber?: number;
  totalDays?: number;
  onPress: () => void;
}

interface MyPlanCardProps {
  plan: BiblePlan;
  progressPercentage?: number;
  currentDayNumber?: number;
  totalDays?: number;
  onPress: () => void;
}

function clampProgress(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getPlanDescription(plan: BiblePlan) {
  return plan.subtitle || plan.description || 'Daily readings to help you stay rooted in God’s Word.';
}

function getTotalDays(plan: BiblePlan, totalDays?: number) {
  const resolvedTotal = totalDays && totalDays > 0 ? totalDays : plan.durationDays;
  return Math.max(resolvedTotal, 1);
}

function MyPlanCard({
  plan,
  progressPercentage,
  currentDayNumber,
  totalDays,
  onPress,
}: MyPlanCardProps) {
  const progress = clampProgress(progressPercentage);
  const days = getTotalDays(plan, totalDays);
  const dayNumber = currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  return (
    <Pressable style={styles.myPlanCard} onPress={onPress}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.myPlanStripe} />

      <View style={styles.myPlanContent}>
        <View style={styles.myPlanHeaderRow}>
          <View style={styles.myPlanTitleWrap}>
            <Text style={styles.myPlanEyebrow}>MY PLAN</Text>
            <Text style={styles.myPlanTitle} numberOfLines={1}>
              {plan.title}
            </Text>
            <Text style={styles.myPlanDayText}>
              Day {dayNumber} of {days}
            </Text>
          </View>

          <View style={styles.myPlanButton}>
            <Text style={styles.myPlanButtonText}>Continue Reading</Text>
            <ChevronRight size={14} color={SECONDARY} strokeWidth={2.5} />
          </View>
        </View>

        <View style={styles.myPlanProgressRow}>
          <View style={styles.progressTrackLarge}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFillLarge, { width: `${Math.max(progress, 4)}%` }]}
            />
          </View>
          <Text style={styles.myPlanPercent}>{progress}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ExplorePlanCard({
  plan,
  isStarted,
  progressPercentage,
  currentDayNumber,
  totalDays,
  onPress,
}: ExplorePlanCardProps) {
  const progress = clampProgress(progressPercentage);
  const days = getTotalDays(plan, totalDays);
  const dayNumber = currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  return (
    <Pressable style={[styles.exploreCard, isStarted && styles.exploreCardStarted]} onPress={onPress}>
      <View style={styles.exploreCardTopRow}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
          <BookOpen size={22} color="#FFFFFF" strokeWidth={2.25} />
        </LinearGradient>

        <View style={styles.exploreCardTextWrap}>
          <Text style={styles.exploreCardTitle} numberOfLines={1}>
            {plan.title}
          </Text>
          <Text style={styles.exploreCardDescription} numberOfLines={2}>
            {getPlanDescription(plan)}
          </Text>
        </View>
      </View>

      <View style={styles.badgesRow}>
        <View style={styles.durationBadge}>
          <Text style={styles.durationBadgeText}>{plan.durationDays} days</Text>
        </View>
        {plan.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText} numberOfLines={1}>
              {plan.category}
            </Text>
          </View>
        ) : null}
        {isStarted ? (
          <View style={styles.startedBadge}>
            <Text style={styles.startedBadgeText}>In Progress</Text>
          </View>
        ) : null}
      </View>

      {isStarted ? (
        <>
          <View style={styles.progressMetaRow}>
            <Text style={styles.dayLabel}>
              Day {dayNumber} of {days}
            </Text>
            <Text style={styles.progressLabel}>{progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.max(progress, 4)}%` }]}
            />
          </View>
        </>
      ) : null}

      <View style={styles.ctaRow}>
        <Text style={[styles.ctaText, isStarted ? styles.ctaTextStarted : styles.ctaTextIdle]}>
          {isStarted ? 'Continue' : 'Start'}
        </Text>
        <ChevronRight
          size={16}
          color={isStarted ? SECONDARY : PRIMARY}
          strokeWidth={2.5}
        />
      </View>
    </Pressable>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function BiblePlansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { plans, loading, hasChurchId } = useBiblePlans();
  const { getUserBiblePlanForPlan } = useUserBiblePlans();

  const myPlans = useMemo(
    () =>
      plans
        .map((plan) => ({ plan, userPlan: getUserBiblePlanForPlan?.(plan.id) }))
        .filter((item) => item.userPlan?.status === 'active'),
    [getUserBiblePlanForPlan, plans],
  );

  const renderEmptyState = (title: string, subtitle: string) => (
    <View style={styles.stateCard}>
      <View style={styles.emptyIconWrap}>
        <BookOpen size={30} color="#B7BEC9" strokeWidth={2.2} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateSubtitle}>{subtitle}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.heroContent, { paddingTop: insets.top + 12 }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={22} color="#1F2937" strokeWidth={2.6} />
          </Pressable>

          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Bible Plans</Text>
            <Text style={styles.heroSubtitle}>Grow closer to God, one day at a time</Text>
          </View>
        </View>

        <View style={styles.heroIconOrb}>
          <BookOpen size={34} color="rgba(255,255,255,0.98)" strokeWidth={2.2} />
        </View>
        <View style={styles.heroGlowLarge} />
        <View style={styles.heroGlowSmall} />
      </LinearGradient>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : !hasChurchId ? (
          <View style={styles.centerState}>{renderEmptyState('Not Available', 'Bible Plans require a linked church account.')}</View>
        ) : plans.length === 0 ? (
          <View style={styles.centerState}>
            {renderEmptyState('No Plans Yet', 'Your church hasn’t published any Bible plans yet. Check back soon.')}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            {myPlans.length > 0 ? (
              <View style={styles.sectionBlock}>
                <SectionHeader title="My Plans" subtitle="Pick up right where you left off." />
                {myPlans.map(({ plan, userPlan }) => (
                  <MyPlanCard
                    key={plan.id}
                    plan={plan}
                    progressPercentage={userPlan?.progressPercentage}
                    currentDayNumber={userPlan?.currentDayNumber}
                    totalDays={userPlan?.totalDays}
                    onPress={() => router.push(`/bible-plans/${plan.id}` as any)}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <SectionHeader title="Explore Plans" subtitle="Find a plan that fits this season of your walk." />
              {plans.map((plan) => {
                const userPlan = getUserBiblePlanForPlan?.(plan.id);

                return (
                  <ExplorePlanCard
                    key={plan.id}
                    plan={plan}
                    isStarted={Boolean(userPlan)}
                    progressPercentage={userPlan?.progressPercentage}
                    currentDayNumber={userPlan?.currentDayNumber}
                    totalDays={userPlan?.totalDays}
                    onPress={() => router.push(`/bible-plans/${plan.id}` as any)}
                  />
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  heroContent: {
    minHeight: 188,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTextWrap: {
    marginTop: 24,
    maxWidth: '74%',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
  },
  heroIconOrb: {
    position: 'absolute',
    right: 24,
    bottom: 26,
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  heroGlowLarge: {
    position: 'absolute',
    right: -24,
    top: 22,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowSmall: {
    position: 'absolute',
    left: -28,
    bottom: -18,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  body: {
    flex: 1,
    marginTop: -16,
    backgroundColor: BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  myPlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 12,
  },
  myPlanStripe: {
    width: 8,
  },
  myPlanContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  myPlanHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  myPlanTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  myPlanEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  myPlanTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  myPlanDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  myPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#F5F0FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  myPlanButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: SECONDARY,
    marginRight: 4,
  },
  myPlanProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  progressTrackLarge: {
    flex: 1,
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFillLarge: {
    height: '100%',
    borderRadius: 999,
  },
  myPlanPercent: {
    width: 40,
    fontSize: 12,
    fontWeight: '800',
    color: SECONDARY,
    textAlign: 'right',
  },
  exploreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EEF0F5',
  },
  exploreCardStarted: {
    borderColor: 'rgba(182,109,255,0.18)',
  },
  exploreCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  exploreCardTextWrap: {
    flex: 1,
  },
  exploreCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 5,
  },
  exploreCardDescription: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: '#6B7280',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 14,
  },
  durationBadge: {
    backgroundColor: '#FFE8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: PRIMARY,
  },
  categoryBadge: {
    backgroundColor: '#F1E8FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: '48%',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: SECONDARY,
  },
  startedBadge: {
    backgroundColor: '#F5F0FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  startedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: SECONDARY,
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: SECONDARY,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 14,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 4,
  },
  ctaTextStarted: {
    color: SECONDARY,
  },
  ctaTextIdle: {
    color: PRIMARY,
  },
  stateCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  stateSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
});
