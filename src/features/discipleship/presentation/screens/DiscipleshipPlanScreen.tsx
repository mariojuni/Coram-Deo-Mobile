import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, CheckCircle, Circle, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useDiscipleshipDetail } from '../hooks/useDiscipleshipDetail';

interface Props {
  planId: string;
}

export function DiscipleshipPlanScreen({ planId }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { plan, weeks, progress, loading } = useDiscipleshipDetail(planId);

  const completedWeeks = useMemo(() => {
    return new Set(progress.filter(p => p.isCompleted).map(p => p.weekId));
  }, [progress]);

  const progressPercentage = useMemo(() => {
    if (!weeks.length) return 0;
    return Math.round((completedWeeks.size / weeks.length) * 100);
  }, [completedWeeks, weeks]);

  const nextIncompleteWeek = useMemo(() => {
    return weeks.find(w => !completedWeeks.has(w.id));
  }, [weeks, completedWeeks]);

  if (loading || !plan) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  const handleContinue = () => {
    if (weeks.length === 0) {
      Alert.alert('No Content', 'This plan currently has no weekly content published.');
      return;
    }
    
    if (nextIncompleteWeek) {
      router.push({
        pathname: '/discipleship/week/[weekId]',
        params: { weekId: nextIncompleteWeek.id, planId }
      });
    } else if (weeks.length > 0) {
      // Re-read last week
      router.push({
        pathname: '/discipleship/week/[weekId]',
        params: { weekId: weeks[weeks.length-1].id, planId }
      });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.backButton, { top: Math.max(insets.top, 20) }]}
        onPress={() => router.back()}
      >
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        <ArrowLeft size={24} color="#111827" />
      </TouchableOpacity>

      <FlatList
        data={weeks}
        extraData={completedWeeks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.coverContainer}>
              {plan.coverImageUrl ? (
                <Image source={{ uri: plan.coverImageUrl }} style={styles.coverImage} />
              ) : (
                <LinearGradient
                  colors={['#FF9EC1', '#CD9EFC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.coverImage, { justifyContent: 'center', alignItems: 'center' }]}
                >
                  <BookOpen size={64} color="#FFFFFF" />
                </LinearGradient>
              )}
              <LinearGradient 
                colors={['rgba(250,250,250,0)', '#FAFAFA']} 
                style={styles.coverFade} 
              />
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.headerContent}>
                <Text style={styles.title}>{plan.title}</Text>
                {plan.subtitle && <Text style={styles.subtitle}>{plan.subtitle}</Text>}
                
                {plan.description && (
                  <Text style={styles.description}>{plan.description}</Text>
                )}

                <View style={styles.compactProgressCard}>
                  <View style={styles.compactProgressRow}>
                    <View style={styles.compactProgressTextCol}>
                      <Text style={styles.compactProgressTitle}>Your Progress</Text>
                      <Text style={styles.compactProgressPercent}>{progressPercentage}%</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.compactContinueButton}
                      activeOpacity={0.8}
                      onPress={handleContinue}
                    >
                      <Text style={styles.compactContinueButtonText}>
                        {completedWeeks.size === 0 ? 'Start' : 
                         progressPercentage === 100 ? 'Review' : 'Continue'}
                      </Text>
                      <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.compactProgressBarBg}>
                    <View style={[styles.compactProgressBarFill, { width: `${progressPercentage}%` }]} />
                  </View>
                </View>
              </View>

              <View style={styles.sectionHeadRow}>
                <View>
                  <Text style={styles.listHeadingOverline}>WHAT'S NEXT</Text>
                  <Text style={styles.listHeading}>Weekly Lessons</Text>
                </View>
                <View style={styles.listCountBadge}>
                  <Text style={styles.listCount}>{weeks.length}</Text>
                </View>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isCompleted = completedWeeks.has(item.id);
          return (
            <TouchableOpacity 
              style={[styles.weekCard, isCompleted && styles.weekCardCompleted]}
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/discipleship/week/[weekId]',
                params: { weekId: item.id, planId }
              })}
            >
              <View style={[styles.weekNumberContainer, isCompleted && styles.weekNumberContainerCompleted]}>
                <Text style={[styles.weekNumberText, isCompleted && styles.weekNumberTextCompleted]}>
                  W{item.weekNumber}
                </Text>
              </View>
              <View style={styles.weekContent}>
                <Text style={styles.weekTitle} numberOfLines={1}>
                  {item.chapterTitle || `Week ${item.weekNumber}`}
                </Text>
                <Text style={styles.weekReference} numberOfLines={1}>
                  {item.scriptureReference}
                </Text>
              </View>
              <View style={styles.statusIcon}>
                {isCompleted ? (
                  <CheckCircle size={22} color="#22C55E" />
                ) : (
                  <Circle size={22} color="#D1D5DB" />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
  coverContainer: {
    height: 260,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    marginTop: -40,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  compactProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F6FA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 10,
  },
  compactProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  compactProgressTextCol: {
    gap: 2,
  },
  compactProgressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactProgressPercent: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  compactContinueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6596',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 6,
  },
  compactContinueButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  compactProgressBarBg: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  compactProgressBarFill: {
    height: '100%',
    backgroundColor: '#FF6596',
    borderRadius: 4,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  listHeadingOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6596',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  listHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  listCountBadge: {
    backgroundColor: '#FFE8F0',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCount: {
    color: '#FF6596',
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 100,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F5F6FA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  weekCardCompleted: {
    backgroundColor: '#FAFAFA',
  },
  weekNumberContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  weekNumberContainerCompleted: {
    backgroundColor: '#ECFDF5',
  },
  weekNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  weekNumberTextCompleted: {
    color: '#059669',
  },
  weekContent: {
    flex: 1,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  weekReference: {
    fontSize: 14,
    color: '#888',
  },
  statusIcon: {
    marginLeft: 12,
  }
});
