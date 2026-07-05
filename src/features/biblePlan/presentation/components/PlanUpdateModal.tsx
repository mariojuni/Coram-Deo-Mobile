import type { BiblePlan } from '@/features/biblePlan/domain/biblePlan.types';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

// ─── Step constants ───────────────────────────────────────────────────────────

export const PLAN_UPDATE_STEP_COUNT = 4;

export const PLAN_UPDATE_STEP_LABELS: Record<number, string> = {
  1: 'Checking day progress…',
  2: 'Saving day completion…',
  3: 'Counting completed days…',
  4: 'Updating your plan…',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  plan: BiblePlan | null;
  currentStep: number;
  stepLabel: string;
  dayNumber?: number;
  totalDays?: number;
  onDone?: () => void;
}

export default function PlanUpdateModal({
  visible,
  plan,
  currentStep,
  stepLabel,
  dayNumber,
  totalDays,
  onDone,
}: Props) {
  // useState lazy init — stable across renders, no ref needed
  const [progressAnim] = useState(() => new Animated.Value(0));
  const isDone = currentStep >= PLAN_UPDATE_STEP_COUNT;
  const [showDone, setShowDone] = useState(false);

  // Reset when modal hides
  useEffect(() => {
    if (!visible) {
      progressAnim.setValue(0);
      const t = setTimeout(() => setShowDone(false), 0);
      return () => clearTimeout(t);
    }
  }, [visible, progressAnim]);

  // Animate bar; on completion dismiss after brief hold
  useEffect(() => {
    const target = isDone ? 1 : currentStep / PLAN_UPDATE_STEP_COUNT;
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 400,
      useNativeDriver: false,
    }).start(() => {
      if (isDone) {
        setShowDone(true);
        setTimeout(() => onDone?.(), 800);
      }
    });
  }, [currentStep, isDone, progressAnim, onDone]);

  const hasDayInfo = (dayNumber ?? 0) > 0 && (totalDays ?? 0) > 0;

  const barWidth = useMemo(
    () => progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
    [progressAnim]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* ── Thumbnail ── */}
          <LinearGradient
            colors={['#FF6596', '#C084FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.thumbnail}
          >
            <BookOpen size={38} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
            {plan && (
              <Text style={styles.thumbnailTitle} numberOfLines={2}>
                {plan.title}
              </Text>
            )}
            {hasDayInfo && (
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>
                  Day {dayNumber} of {totalDays}
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* ── Body ── */}
          <View style={styles.body}>
            <Text style={styles.title}>
              {showDone ? 'Progress saved!' : 'Saving your progress'}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {showDone ? 'Your reading is recorded.' : (stepLabel || 'Please wait…')}
            </Text>

            {/* ── Progress bar ── */}
            <View style={styles.track}>
              <Animated.View
                style={[
                  styles.fillWrapper,
                  { width: barWidth },
                ]}
              >
                <LinearGradient
                  colors={['#FF6596', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.fillGradient}
                />
              </Animated.View>
            </View>

            {!showDone && (
              <Text style={styles.stepCount}>
                Step {Math.min(currentStep, PLAN_UPDATE_STEP_COUNT)} of {PLAN_UPDATE_STEP_COUNT}
              </Text>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  thumbnail: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  thumbnailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  dayBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 2,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.2,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  track: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
    marginTop: 10,
  },
  fillWrapper: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 4,
  },
  fillGradient: {
    flex: 1,
    width: '100%',
  },
  stepCount: {
    fontSize: 11,
    color: '#C0C0C0',
    marginTop: 2,
  },
});
