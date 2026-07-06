import type { BiblePlanDay } from '@/features/biblePlan/domain/biblePlan.types';
import PlanUpdateModal from '@/features/biblePlan/presentation/components/PlanUpdateModal';
import { useBiblePlanDetail } from '@/features/biblePlan/presentation/hooks/useBiblePlanDetail';
import { useAuthStore } from '@/store/useAuthStore';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { Timestamp } from 'firebase/firestore';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ────────────────────────────────────────────────────────────────

function splitPassages(passage: string): string[] {
  return passage.split(';').map((p) => p.trim()).filter(Boolean);
}

function toDate(v?: Timestamp | string | null): Date | null {
  if (!v) return null;
  if (typeof v === 'string') return new Date(v);
  if (typeof (v as any).toDate === 'function') return (v as Timestamp).toDate();
  return null;
}

/** Returns Date for day N (1-based) of a plan given its start date. */
function getDayDate(startDate: Date, dayNumber: number): Date {
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isToday(d: Date): boolean {
  const t = todayMidnight();
  return d.getTime() === t.getTime();
}

function isMissedDate(d: Date): boolean {
  return d.getTime() < todayMidnight().getTime();
}

function formatChipDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Chip metrics (must stay in sync with stylesheet) ────────────────────────
const CHIP_WIDTH = 60;
const CHIP_GAP = 8;
const CHIP_ITEM_SIZE = CHIP_WIDTH + CHIP_GAP; // used by FlatList getItemLayout
const CHIP_STRIP_PADDING = 20;

// ─── Memoized day chip — only re-renders when its own props change ─────────

interface DayChipProps {
  day: BiblePlanDay;
  isSelected: boolean;
  done: boolean;
  isTodayChip: boolean;
  isMissedChip: boolean;
  date: Date | null;
  onPress: (dayNumber: number) => void;
}

const DayChip = memo(function DayChip({
  day, isSelected, done, isTodayChip, isMissedChip, date, onPress,
}: DayChipProps) {
  return (
    <Pressable
      style={[
        styles.chip,
        isSelected && styles.chipSelected,
        !done && isTodayChip && styles.chipToday,
        !done && !isTodayChip && isMissedChip && styles.chipMissed,
      ]}
      onPress={() => onPress(day.dayNumber)}
    >
      {done && <View style={styles.chipDoneDot} />}

      <Text style={[
        styles.chipNum,
        isSelected && !done && styles.chipNumSelected,
        done && styles.chipNumDone,
        !done && isTodayChip && styles.chipNumToday,
        !done && !isTodayChip && isMissedChip && styles.chipNumMissed,
      ]}>
        {day.dayNumber}
      </Text>

      {date ? (
        isTodayChip ? (
          <View style={styles.chipTodayPill}>
            <Text style={styles.chipTodayPillText}>Today</Text>
          </View>
        ) : (
          <Text style={[
            styles.chipDate,
            done && styles.chipDateDone,
            isMissedChip && styles.chipDateMissed,
            isSelected && !done && styles.chipDateSelected,
          ]}>
            {formatChipDate(date)}
          </Text>
        )
      ) : null}
    </Pressable>
  );
});

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function BiblePlanDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const dayScrollRef = useRef<ScrollView>(null);
  const chipStripRef = useRef<FlatList<BiblePlanDay>>(null);

  const {
    plan,
    days,
    userBiblePlan,
    completedDayIds,
    isStarted,
    isCompleted,
    currentDayNumber,
    progressPercentage,
    nextIncompleteDay,
  } = useBiblePlanDetail(planId ?? '');

  const startPlan = useBiblePlanStore((s) => s.startPlan);
  const plansLoading = useBiblePlanStore((s) => s.plansLoading);
  const initializeProgressListener = useBiblePlanStore((s) => s.initializeProgressListener);
  const initializeUserBiblePlansListener = useBiblePlanStore((s) => s.initializeUserBiblePlansListener);
  const initializePlansListener = useBiblePlanStore((s) => s.initializePlansListener);
  const planUpdateVisible = useBiblePlanStore((s) => s.planUpdateVisible);
  const planUpdateStep = useBiblePlanStore((s) => s.planUpdateStep);
  const planUpdateStepLabel = useBiblePlanStore((s) => s.planUpdateStepLabel);
  const planUpdateDayNumber = useBiblePlanStore((s) => s.planUpdateDayNumber);
  const planUpdateTotalDays = useBiblePlanStore((s) => s.planUpdateTotalDays);
  const closePlanUpdate = useBiblePlanStore((s) => s.closePlanUpdate);
  const [starting, setStarting] = useState(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  // Always sync selected chip to the current day from the store
  useEffect(() => {
    const target = currentDayNumber > 0 ? currentDayNumber : 1;
    const frame = requestAnimationFrame(() => {
      setSelectedDayNumber((previous) => (previous === target ? previous : target));
    });
    return () => cancelAnimationFrame(frame);
  }, [currentDayNumber]);

  // ─── Chip strip scroll ────────────────────────────────────────────────────

  // Set to true on focus; cleared after the first successful scroll.
  // Chip taps never set this, so they never trigger auto-scroll.
  const pendingScrollRef = useRef(false);

  const scrollChipToCenter = useCallback(
    (dayNumber: number) => {
      const index = dayNumber - 1;
      if (index < 0) return;
      chipStripRef.current?.scrollToIndex({
        index,
        animated: false,
        viewPosition: 0.5, // center the item
      });
    },
    []
  );

  // On focus: re-init both listeners and arm the pending scroll flag.
  useFocusEffect(
    useCallback(() => {
      const churchId = userProfile?.churchId ?? null;
      const userId = currentUser?.uid ?? null;

      let unsubProgress: (() => void) | undefined;
      let unsubPlans: (() => void) | undefined;
      let unsubBiblePlans: (() => void) | undefined;

      if (userId && churchId && planId) {
        unsubProgress = initializeProgressListener(userId, planId, churchId);
        unsubPlans = initializeUserBiblePlansListener(userId, churchId);
        unsubBiblePlans = initializePlansListener(churchId);
      }

      pendingScrollRef.current = true;

      return () => {
        unsubProgress?.();
        unsubPlans?.();
        unsubBiblePlans?.();
      };
    }, [
      userProfile?.churchId,
      currentUser?.uid,
      planId,
      initializeProgressListener,
      initializeUserBiblePlansListener,
      initializePlansListener,
    ])
  );

  // Scroll once when days are rendered AND a scroll is pending (set by focus).
  // Chip taps change selectedDayNumber but pendingScrollRef stays false → no scroll.
  useEffect(() => {
    if (!pendingScrollRef.current || days.length === 0) return;
    pendingScrollRef.current = false;
    const timer = setTimeout(() => scrollChipToCenter(selectedDayNumber), 100);
    return () => clearTimeout(timer);
  }, [days.length, selectedDayNumber, scrollChipToCenter]);

  const totalDays = plan ? (plan.durationDays || days.length) : 0;
  const selectedDay = days.find((d) => d.dayNumber === selectedDayNumber) ?? days[0] ?? null;
  const selectedDayPassages = selectedDay ? splitPassages(selectedDay.scriptureReference) : [];
  const selectedDayCompleted = selectedDay ? completedDayIds.has(selectedDay.id) : false;

  // ─── Date calculations (only when plan is started)
  const planStartDate = toDate(userBiblePlan?.startedAt);

  const dayMetaMap = useMemo(() => {
    const map = new Map<number, { date: Date | null; isToday: boolean; isMissed: boolean }>();
    if (!planStartDate) return map;
    days.forEach((d) => {
      const date = getDayDate(planStartDate, d.dayNumber);
      map.set(d.dayNumber, {
        date,
        isToday: isToday(date),
        isMissed: isMissedDate(date),
      });
    });
    return map;
  }, [days, planStartDate]);

  const getDayMeta = (dayNumber: number) =>
    dayMetaMap.get(dayNumber) ?? { date: null, isToday: false, isMissed: false };

  const missedCount = useMemo(
    () =>
      isStarted
        ? days.filter((d) => {
            if (completedDayIds.has(d.id)) return false;
            return dayMetaMap.get(d.dayNumber)?.isMissed ?? false;
          }).length
        : 0,
    [isStarted, days, completedDayIds, dayMetaMap]
  );

  const selectedDayMeta = getDayMeta(selectedDayNumber);

  const ctaBottomPad = Math.max(insets.bottom, 20);

  const handleStart = async () => {
    const churchId = userProfile?.churchId;
    const userId = currentUser?.uid;
    if (!churchId || !userId || !plan) return;
    setStarting(true);
    try {
      await startPlan({
        churchId,
        userId,
        memberId: userProfile?.memberId ?? null,
        planId: plan.id,
        totalDays,
      });
      const day1 = days.find((d) => d.dayNumber === 1) ?? days[0];
      if (day1) router.push(`/bible-plans/${plan.id}/day/${day1.id}` as any);
    } catch {
      Alert.alert('Error', 'Could not start the plan. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleContinue = () => {
    if (!nextIncompleteDay || !plan) return;
    router.push(`/bible-plans/${plan.id}/day/${nextIncompleteDay.id}` as any);
  };

  const handlePassagePress = () => {
    if (!selectedDay || !plan) return;
    router.push(`/bible-plans/${plan.id}/day/${selectedDay.id}` as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.root, { paddingTop: insets.top }]}>

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable style={styles.headerCircle} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color="#1a1a1a" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Bible Plan</Text>
          {/* spacer to keep title centered */}
          <View style={styles.headerCircle} />
        </View>

        {!plan && plansLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#FF6596" size="large" />
          </View>
        ) : !plan ? (
          // Plans loaded but this plan wasn't found (unpublished / deleted)
          <View style={styles.loader}>
            <Text style={{ color: '#999', fontSize: 15 }}>Plan not found.</Text>
          </View>
        ) : (
          <>
            <ScrollView
              ref={dayScrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: ctaBottomPad + 88 }}
            >

              {/* ─── Hero card ─────────────────────────────────────────────── */}
              <View style={styles.heroCard}>
                <LinearGradient
                  colors={['#FFE8F0', '#F5E8FF', '#E8EEFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroGradient}
                >
                  <BookOpen size={26} color="#E091B4" strokeWidth={1.5} style={styles.heroIcon} />
                  <Text
                    style={styles.heroFaded}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.45}
                  >
                    {plan.title.toUpperCase()}
                  </Text>
                  <View style={styles.heroLine} />
                </LinearGradient>
              </View>

              {/* ─── Progress bar (only when started) ─────────────────────── */}
              {isStarted && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={['#FF6596', '#C084FC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.progressFill,
                        { width: `${Math.max(progressPercentage, 2)}%` as any },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {userBiblePlan?.completedDaysCount ?? 0}/{totalDays}
                  </Text>
                </View>
              )}

              {/* ─── Day chip strip (virtualized FlatList for large plans) ─── */}
              {days.length > 0 && (
                <FlatList
                  ref={chipStripRef}
                  data={days}
                  horizontal
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayStripContent}
                  style={styles.dayStrip}
                  // Exact item dimensions eliminate measurement overhead for 730 items
                  getItemLayout={(_data, index) => ({
                    length: CHIP_ITEM_SIZE,
                    offset: CHIP_STRIP_PADDING + index * CHIP_ITEM_SIZE,
                    index,
                  })}
                  initialNumToRender={12}
                  maxToRenderPerBatch={20}
                  windowSize={5}
                  removeClippedSubviews
                  renderItem={({ item: day }) => {
                    const done = completedDayIds.has(day.id);
                    const isSelected = day.dayNumber === selectedDayNumber;
                    const meta = getDayMeta(day.dayNumber);
                    const isTodayChip = isStarted && !done && meta.isToday;
                    const isMissedChip = isStarted && !done && meta.isMissed;
                    return (
                      <DayChip
                        day={day}
                        isSelected={isSelected}
                        done={done}
                        isTodayChip={isTodayChip}
                        isMissedChip={isMissedChip}
                        date={meta.date}
                        onPress={setSelectedDayNumber}
                      />
                    );
                  }}
                />
              )}

              {/* ─── Day heading + missed badge ────────────────────────────── */}
              {selectedDay && (
                <View style={styles.dayHeadRow}>
                  <View>
                    <Text style={styles.dayHeadText}>
                      Day {selectedDay.dayNumber}{totalDays > 0 ? ` of ${totalDays}` : ''}
                    </Text>
                    {/* Show selected day's date if available */}
                    {selectedDayMeta.date && (
                      <Text style={styles.dayHeadDate}>
                        {selectedDayMeta.date.toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric',
                        })}
                      </Text>
                    )}
                  </View>

                  {/* Right side badges */}
                  <View style={styles.dayHeadBadges}>
                    {selectedDayCompleted && (
                      <View style={styles.doneBadge}>
                        <CheckCircle2 size={11} color="#22C55E" />
                        <Text style={styles.doneBadgeText}>Done</Text>
                      </View>
                    )}
                    {missedCount > 0 && (
                      <View style={styles.missedBadge}>
                        <Text style={styles.missedBadgeText}>
                          {missedCount} Missed {missedCount === 1 ? 'Day' : 'Days'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* ─── Passage rows ──────────────────────────────────────────── */}
              {selectedDayPassages.length > 0 ? (
                selectedDayPassages.map((passage, idx) => (
                  <Pressable
                    key={`${selectedDayNumber}-${idx}`}
                    style={[
                      styles.passageRow,
                      idx < selectedDayPassages.length - 1 && styles.passageRowDivider,
                    ]}
                    onPress={handlePassagePress}
                  >
                    {selectedDayCompleted ? (
                      <CheckCircle2 size={22} color="#22C55E" strokeWidth={2} />
                    ) : (
                      <View style={styles.passageCircle} />
                    )}
                    <Text style={[styles.passageText, selectedDayCompleted && styles.passageTextDone]}>
                      {passage}
                    </Text>
                    <ChevronRight size={16} color="#C8C8C8" />
                  </Pressable>
                ))
              ) : (
                <Text style={styles.noReadings}>No readings for this day.</Text>
              )}

              {/* ─── About plan ────────────────────────────────────────────── */}
              {plan.description ? (
                <View style={styles.aboutSection}>
                  <Text style={styles.aboutLabel}>ABOUT THIS PLAN</Text>
                  <Text style={styles.aboutText}>{plan.description}</Text>
                </View>
              ) : null}

            </ScrollView>

            {/* ─── Fixed bottom CTA ──────────────────────────────────────── */}
            <View style={[styles.cta, { paddingBottom: ctaBottomPad }]}>
              {isCompleted ? (
                <View style={styles.ctaDoneRow}>
                  <CheckCircle2 size={18} color="#22C55E" />
                  <Text style={styles.ctaDoneText}>Plan Completed 🎉</Text>
                </View>
              ) : isStarted ? (
                <Pressable onPress={handleContinue} style={styles.ctaBtn}>
                  <LinearGradient
                    colors={['#FF6596', '#C084FC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                  >
                    <Text style={styles.ctaText}>Continue Reading</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable onPress={handleStart} disabled={starting} style={styles.ctaBtn}>
                  <LinearGradient
                    colors={['#FF6596', '#C084FC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                  >
                    {starting
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.ctaText}>Start Reading</Text>
                    }
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>

      {/* ─── Plan Update Modal (shown after finishing a reading day) */}
      <PlanUpdateModal
        visible={planUpdateVisible}
        plan={plan ?? null}
        currentStep={planUpdateStep}
        stepLabel={planUpdateStepLabel}
        dayNumber={planUpdateDayNumber}
        totalDays={planUpdateTotalDays}
        onDone={closePlanUpdate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ─── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },

  // ─── Hero
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  heroGradient: {
    height: 175,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: { marginBottom: 14 },
  heroFaded: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 5,
    color: 'rgba(190, 110, 150, 0.45)',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  heroLine: {
    width: 32,
    height: 2,
    backgroundColor: 'rgba(255, 101, 150, 0.4)',
    borderRadius: 1,
    marginTop: 14,
  },

  // ─── Progress
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#F0E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6596',
    minWidth: 38,
    textAlign: 'right',
  },

  // ─── Day chip strip
  dayStrip: { marginBottom: 20 },
  dayStripContent: { paddingHorizontal: 20, alignItems: 'flex-start' },

  chip: {
    width: 60,
    marginRight: 8,
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FF6596',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  chipToday: {
    backgroundColor: '#FFF0F5',
    borderColor: '#FFB6D0',
  },
  chipMissed: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },

  chipDoneDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },

  chipNum: {
    fontSize: 17,
    fontWeight: '800',
    color: '#BBBBB4',
  },
  chipNumSelected: { color: '#FF6596' },
  chipNumDone: { fontSize: 17, color: '#BBBBBB' },
  chipNumToday: { color: '#FF6596' },
  chipNumMissed: { color: '#D97706' },

  chipDate: {
    fontSize: 10,
    fontWeight: '500',
    color: '#AAAAAA',
  },
  chipDateSelected: { color: '#FF6596' },
  chipDateDone: { color: '#BBBBBB' },
  chipDateMissed: { color: '#D97706' },

  chipTodayPill: {
    backgroundColor: '#FF6596',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  chipTodayPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ─── Day heading
  dayHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    marginBottom: 14,
  },
  dayHeadText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  dayHeadDate: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '500',
    marginTop: 2,
  },
  dayHeadBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  doneBadgeText: { fontSize: 11, fontWeight: '700', color: '#22C55E' },

  missedBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  missedBadgeText: { fontSize: 11, fontWeight: '700', color: '#D97706' },

  // ─── Passage rows
  passageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  passageRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  passageCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
  },
  passageText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  passageTextDone: { color: '#AFAFAF' },
  noReadings: {
    textAlign: 'center',
    fontSize: 14,
    color: '#BBBBBB',
    marginTop: 24,
    marginHorizontal: 20,
  },

  // ─── About
  aboutSection: {
    marginHorizontal: 20,
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  aboutLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#FF6596',
    marginBottom: 8,
  },
  aboutText: { fontSize: 14, color: '#777', lineHeight: 22 },

  // ─── Fixed CTA
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  ctaBtn: { borderRadius: 32, overflow: 'hidden' },
  ctaGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  ctaDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: '#F0FDF4',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  ctaDoneText: { fontSize: 16, fontWeight: '700', color: '#22C55E' },
});
