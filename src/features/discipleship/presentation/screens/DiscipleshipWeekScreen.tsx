import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react-native';
import { BounceCard } from '@/components/ui/BounceCard';
import { SoftCard } from '@/components/ui/SoftCard';
import { useDiscipleshipDetail } from '../hooks/useDiscipleshipDetail';

interface Props {
  planId: string;
  weekId: string;
  groupId?: string;
}

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultExpanded = false, children }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <View style={styles.cardSectionWrap}>
      <SoftCard innerStyle={styles.cardInner}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderTitleRow}>
            {icon ? <View style={styles.sectionIconWrap}>{icon}</View> : null}
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          {expanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
        </TouchableOpacity>
        {expanded && <View style={styles.cardContent}>{children}</View>}
      </SoftCard>
    </View>
  );
}

export function DiscipleshipWeekScreen({ planId, weekId, groupId }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { plan, weeks, progress, loading, markCompleted } = useDiscipleshipDetail(planId);

  const currentWeek = useMemo(() => {
    return weeks.find((w) => w.id === weekId);
  }, [weeks, weekId]);

  const isCompleted = useMemo(() => {
    if (!progress || progress.length === 0) return false;
    return progress.some(
      (p) =>
        (p.weekId === weekId || p.lessonId === weekId) &&
        p.isCompleted === true
    );
  }, [progress, weekId]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const titleOpacity = scrollY.interpolate({
    inputRange: [50, 110],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading || !currentWeek) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  const handleMarkComplete = async () => {
    await markCompleted(weekId, currentWeek.weekNumber, groupId);
    router.back();
  };

  const topInset = Math.max(insets.top, 16);

  return (
    <View style={styles.container}>
      {/* ── Frosted System Header ── */}
      <View style={[styles.frostedHeader, { paddingTop: topInset }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconCircleBtn}>
          <ArrowLeft size={18} color="#111827" />
        </TouchableOpacity>
        <Animated.View style={{ flex: 1, opacity: titleOpacity }}>
          <Text style={styles.headerOverline}>DISCIPLESHIP PLAN</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Lesson {currentWeek.weekNumber} • {plan?.title || 'Study'}
          </Text>
        </Animated.View>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 65 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Banner Card ── */}
        <SoftCard innerStyle={styles.heroCardInner}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroBadge}>LESSON {currentWeek.weekNumber}</Text>
            <Text style={styles.chapterTitle}>{currentWeek.chapterTitle}</Text>
            {currentWeek.scriptureReference ? (
              <View style={styles.scripturePill}>
                <BookOpen size={12} color="#FFFFFF" />
                <Text style={styles.scriptureRefText}>{currentWeek.scriptureReference}</Text>
              </View>
            ) : null}
          </View>
        </SoftCard>

        {/* ── Collapsible Sections ── */}
        {currentWeek.suggestedFlow ? (
          <CollapsibleSection
            title="Suggested Flow"
            icon={<Sparkles size={16} color="#FF6596" />}
            defaultExpanded={true}
          >
            <Text style={styles.bodyText}>{currentWeek.suggestedFlow}</Text>
          </CollapsibleSection>
        ) : null}

        {currentWeek.storyText ? (
          <CollapsibleSection
            title="Pakinggan ang Kuwento"
            icon={<BookOpen size={16} color="#B66DFF" />}
            defaultExpanded={!currentWeek.suggestedFlow}
          >
            <Text style={styles.bodyText}>{currentWeek.storyText}</Text>
          </CollapsibleSection>
        ) : null}

        {currentWeek.retellInstruction || currentWeek.retellActivity ? (
          <CollapsibleSection
            title="Kayo naman ngayon ang magkuwento"
            icon={<FileText size={16} color="#EC4899" />}
          >
            {currentWeek.retellInstruction ? (
              <Text style={[styles.bodyText, styles.instructionText]}>
                {currentWeek.retellInstruction}
              </Text>
            ) : null}
            {currentWeek.retellActivity ? (
              <Text style={styles.bodyText}>{currentWeek.retellActivity}</Text>
            ) : null}
          </CollapsibleSection>
        ) : null}

        {currentWeek.discussionQuestions ? (
          <CollapsibleSection
            title="Pag-usapan natin ang kuwento"
            icon={<HelpCircle size={16} color="#8B5CF6" />}
          >
            <Text style={styles.bodyText}>{currentWeek.discussionQuestions}</Text>
          </CollapsibleSection>
        ) : null}

        {currentWeek.keyTruths ? (
          <CollapsibleSection title="Natutunan natin sa kuwento">
            <Text style={styles.bodyText}>{currentWeek.keyTruths}</Text>
          </CollapsibleSection>
        ) : null}

        {currentWeek.applicationQuestions ? (
          <CollapsibleSection title="Upang bumago sa buhay mo">
            <Text style={styles.bodyText}>{currentWeek.applicationQuestions}</Text>
          </CollapsibleSection>
        ) : null}

        {currentWeek.additionalStudy ? (
          <CollapsibleSection title="Karagdagang pag-aaral">
            <Text style={styles.bodyText}>{currentWeek.additionalStudy}</Text>
          </CollapsibleSection>
        ) : null}

        {/* ── Completion Action Button ── */}
        <BounceCard activeOpacity={0.85} onPress={handleMarkComplete}>
          <View style={[styles.completeButton, isCompleted && styles.completedButtonBg]}>
            <Check size={18} color={isCompleted ? '#059669' : '#FFFFFF'} />
            <Text style={[styles.completeButtonText, isCompleted && styles.completedButtonText]}>
              {isCompleted ? 'Completed' : 'Mark as Completed'}
            </Text>
          </View>
        </BounceCard>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  frostedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.7)',
    gap: 12,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 12,
  },
  heroCardInner: {
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  heroContent: {
    gap: 6,
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  chapterTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  scripturePill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  scriptureRefText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
    lineHeight: 16,
  },
  cardSectionWrap: {
    borderRadius: 16,
  },
  cardInner: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  cardContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bodyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  instructionText: {
    fontStyle: 'italic',
    color: '#6B7280',
    marginBottom: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6596',
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 12,
    gap: 8,
  },
  completedButtonBg: {
    backgroundColor: '#D1FAE5',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  completedButtonText: {
    color: '#059669',
  },
});
