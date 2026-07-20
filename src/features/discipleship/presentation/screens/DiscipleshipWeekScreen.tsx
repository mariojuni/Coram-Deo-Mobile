import React, { useMemo, useState } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useDiscipleshipDetail } from '../hooks/useDiscipleshipDetail';

interface Props {
  planId: string;
  weekId: string;
}

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultExpanded = false, children }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <View style={styles.cardSection}>
      <TouchableOpacity 
        style={styles.cardHeader} 
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        {expanded ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
      </TouchableOpacity>
      {expanded && (
        <View style={styles.cardContent}>
          {children}
        </View>
      )}
    </View>
  );
}

export function DiscipleshipWeekScreen({ planId, weekId }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { weeks, progress, loading, markCompleted } = useDiscipleshipDetail(planId);

  const currentWeek = useMemo(() => {
    return weeks.find(w => w.id === weekId);
  }, [weeks, weekId]);

  const isCompleted = useMemo(() => {
    return progress.some(p => p.weekId === weekId && p.isCompleted);
  }, [progress, weekId]);

  if (loading || !currentWeek) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  const handleMarkComplete = async () => {
    await markCompleted(weekId, currentWeek.weekNumber);
    router.back();
  };

  const headerHeight = Math.max(insets.top, 24) + 50;

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

        <View style={styles.headerRow}>
          <BounceCard bounceScale={0.85} 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </BounceCard>
          <Text style={styles.headerTitle}>Week {currentWeek.weekNumber}</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.chapterTitle}>{currentWeek.chapterTitle}</Text>
          <Text style={styles.scriptureRef}>{currentWeek.scriptureReference}</Text>
        </View>

        {currentWeek.suggestedFlow && (
          <CollapsibleSection title="Suggested Flow" defaultExpanded={true}>
            <Text style={styles.bodyText}>{currentWeek.suggestedFlow}</Text>
          </CollapsibleSection>
        )}

        {currentWeek.storyText && (
          <CollapsibleSection title="Pakinggan ang Kuwento" defaultExpanded={!currentWeek.suggestedFlow}>
            <Text style={styles.bodyText}>{currentWeek.storyText}</Text>
          </CollapsibleSection>
        )}

        {(currentWeek.retellInstruction || currentWeek.retellActivity) && (
          <CollapsibleSection title="Kayo naman ngayon ang magkuwento">
            {currentWeek.retellInstruction && (
              <Text style={[styles.bodyText, styles.instructionText]}>
                {currentWeek.retellInstruction}
              </Text>
            )}
            {currentWeek.retellActivity && (
              <Text style={styles.bodyText}>{currentWeek.retellActivity}</Text>
            )}
          </CollapsibleSection>
        )}

        {currentWeek.discussionQuestions && (
          <CollapsibleSection title="Pag-usapan natin ang kuwento">
            <Text style={styles.bodyText}>{currentWeek.discussionQuestions}</Text>
          </CollapsibleSection>
        )}

        {currentWeek.keyTruths && (
          <CollapsibleSection title="Natutunan natin sa kuwento">
            <Text style={styles.bodyText}>{currentWeek.keyTruths}</Text>
          </CollapsibleSection>
        )}

        {currentWeek.applicationQuestions && (
          <CollapsibleSection title="Upang bumago sa buhay mo">
            <Text style={styles.bodyText}>{currentWeek.applicationQuestions}</Text>
          </CollapsibleSection>
        )}
        
        {currentWeek.additionalStudy && (
          <CollapsibleSection title="Karagdagang pag-aaral">
            <Text style={styles.bodyText}>{currentWeek.additionalStudy}</Text>
          </CollapsibleSection>
        )}

        <TouchableOpacity 
          style={[styles.completeButton, isCompleted && styles.completedButtonBg]}
          activeOpacity={0.8}
          onPress={handleMarkComplete}
          disabled={isCompleted}
        >
          <Check size={20} color={isCompleted ? "#059669" : "#FFFFFF"} />
          <Text style={[styles.completeButtonText, isCompleted && styles.completedButtonText]}>
            {isCompleted ? 'Completed' : 'Mark as Completed'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  titleContainer: {
    marginBottom: 32,
  },
  chapterTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  scriptureRef: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6596',
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F6FA',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  bodyText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  instructionText: {
    fontStyle: 'italic',
    color: '#6B7280',
    marginBottom: 12,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6596',
    paddingVertical: 16,
    borderRadius: 999,
    marginTop: 20,
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
  }
});
