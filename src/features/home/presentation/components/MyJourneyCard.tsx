import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMyJourney } from '../../../myJourney/presentation/hooks/useMyJourney';
import { BounceCard } from '@/components/ui/BounceCard';
import { SoftCard } from '@/components/ui/SoftCard';
import { Activity, ChevronRight } from 'lucide-react-native';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function MyJourneyCard() {
  const router = useRouter();
  const { metrics, loading } = useMyJourney();

  if (loading) {
    return null; // hide entirely while loading to prevent jank
  }

  // If absolutely no activity, don't show the card to new users.
  if (
    metrics.readingDaysCount === 0 &&
    metrics.notesCreatedCount === 0 &&
    metrics.highlightsCreatedCount === 0 &&
    metrics.planDaysCompletedCount === 0
  ) {
    return null; 
  }

  return (
    <View style={styles.wrapper}>
      <BounceCard onPress={() => router.push('/my-journey')}>
        <SoftCard innerStyle={styles.cardInner}>
          
          <View style={styles.leftContent}>
            <View style={styles.iconWrap}>
              <Activity size={14} color="#FF759E" strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.title}>My Journey</Text>
              <Text style={styles.readingDays}>{metrics.readingDaysCount} {metrics.readingDaysCount === 1 ? 'day' : 'days'}</Text>
            </View>
          </View>

          <View style={styles.rightContent}>
            <View style={styles.daysContainer}>
              {DAYS.map((day, index) => {
                const isActive = metrics.activityByDay[index];
                return (
                  <View 
                    key={index} 
                    style={[styles.dayCircle, isActive ? styles.dayCircleActive : styles.dayCircleInactive]}
                  >
                    <Text style={[styles.dayText, isActive ? styles.dayTextActive : styles.dayTextInactive]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
            <ChevronRight size={16} color="#D1D5DB" strokeWidth={2.5} />
          </View>

        </SoftCard>
      </BounceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  cardInner: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 117, 158, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  readingDays: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dayCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#FF759E',
  },
  dayCircleInactive: {
    backgroundColor: '#F3F4F6',
  },
  dayText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  dayTextInactive: {
    color: '#9CA3AF',
  },
});
