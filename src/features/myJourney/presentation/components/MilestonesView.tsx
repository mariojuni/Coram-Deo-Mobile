import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SoftCard } from '@/components/ui/SoftCard';
import { useAuthStore } from '@/store/useAuthStore';
import { myJourneyMilestoneRepository } from '../../data/milestone.repository';
import type { MyJourneyMilestone } from '../../domain/milestone.types';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';
import { Check } from 'lucide-react-native';

export function MilestonesView() {
  const [milestones, setMilestones] = useState<MyJourneyMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore(s => s.currentUser);

  useEffect(() => {
    let mounted = true;
    async function fetchMilestones() {
      if (!currentUser?.uid) return;
      try {
        const ms = await myJourneyMilestoneRepository.getUserMilestones(currentUser.uid);
        if (mounted) {
          setMilestones(ms);
        }
      } catch (e) {
        console.warn('Error fetching milestones', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchMilestones();
    return () => { mounted = false; };
  }, [currentUser]);

  if (loading) {
    return (
      <View style={{ paddingTop: 16 }}>
        <ShimmerSkeleton width="100%" height={90} borderRadius={24} style={{ marginBottom: 16 }} />
        <ShimmerSkeleton width="100%" height={90} borderRadius={24} />
      </View>
    );
  }

  if (milestones.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Bible Milestones</Text>
        <Text style={styles.emptyText}>
          Meaningful milestones from your Scripture journey will appear here.
          Continue reading, taking Notes, and completing Reading Plans.
        </Text>
      </View>
    );
  }

  // Group chronologically by month
  const grouped: Record<string, MyJourneyMilestone[]> = {};
  for (const m of milestones) {
    let d: Date;
    if (m.achievedAt && (m.achievedAt as any).toDate) {
      d = (m.achievedAt as any).toDate();
    } else {
      d = new Date(m.achievedAt as string);
    }
    const month = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(m);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>BIBLE MILESTONES</Text>
      
      {Object.entries(grouped).map(([month, items]) => (
        <View key={month} style={styles.monthGroup}>
          <Text style={styles.monthTitle}>{month}</Text>
          
          {items.map(m => {
             let d: Date;
             if (m.achievedAt && (m.achievedAt as any).toDate) {
               d = (m.achievedAt as any).toDate();
             } else {
               d = new Date(m.achievedAt as string);
             }
             const dayStr = d.toLocaleString('default', { month: 'short', day: 'numeric' });

             return (
               <SoftCard key={m.id} style={styles.cardSpacing} innerStyle={styles.cardInner}>
                 <View style={styles.cardRow}>
                   <View style={styles.iconWrap}>
                     <Check size={18} color="#fff" />
                   </View>
                   <View style={styles.textContent}>
                     <Text style={styles.msTitle}>{m.title}</Text>
                     <Text style={styles.msDate}>{dayStr}</Text>
                   </View>
                 </View>
               </SoftCard>
             );
          })}
        </View>
      ))}
      
      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    marginBottom: 24,
    marginLeft: 4,
  },
  monthGroup: {
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 4,
  },
  cardSpacing: {
    marginBottom: 12,
  },
  cardInner: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6596',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  msTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  msDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
