import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Bookmark, BookOpen, Calendar, Users, ShieldCheck } from 'lucide-react-native';
import { SoftCard } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import { LinearGradient } from 'expo-linear-gradient';

interface QuickStatsRowProps {
  stats: {
    highlightsCount: number;
    notesCount: number;
    plansCount: number;
    groupsCount: number;
    ministriesCount: number;
  };
  onStatPress?: (statKey: 'highlights' | 'notes' | 'plans' | 'groups' | 'ministries') => void;
}

export function QuickStatsRow({ stats, onStatPress }: QuickStatsRowProps) {
  const items = [
    {
      key: 'highlights' as const,
      label: 'Highlights',
      value: stats.highlightsCount,
      icon: Bookmark,
      color: '#EC4899',
      bgColor: '#FCE7F3',
      gradient: ['#EC4899', '#F43F5E'] as const,
    },
    {
      key: 'notes' as const,
      label: 'Notes',
      value: stats.notesCount,
      icon: BookOpen,
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
      gradient: ['#8B5CF6', '#A855F7'] as const,
    },
    {
      key: 'plans' as const,
      label: 'Plans',
      value: stats.plansCount,
      icon: Calendar,
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      gradient: ['#3B82F6', '#60A5FA'] as const,
    },
    {
      key: 'groups' as const,
      label: 'Groups',
      value: stats.groupsCount,
      icon: Users,
      color: '#10B981',
      bgColor: '#D1FAE5',
      gradient: ['#10B981', '#34D399'] as const,
    },
    {
      key: 'ministries' as const,
      label: 'Ministries',
      value: stats.ministriesCount,
      icon: ShieldCheck,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      gradient: ['#F59E0B', '#FBBF24'] as const,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {items.map((item) => {
          const IconComp = item.icon;
          return (
            <BounceCard
              key={item.key}
              onPress={() => onStatPress?.(item.key)}
              activeOpacity={0.8}
            >
              <SoftCard style={styles.cardOuter} innerStyle={styles.cardInner}>
                <View style={styles.cardWrapper}>
                  <LinearGradient
                    colors={item.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.cardTopAccent}
                  />
                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
                        <IconComp size={15} color={item.color} />
                      </View>
                      <Text style={styles.valueText}>{item.value}</Text>
                    </View>
                    <View style={styles.labelRow}>
                      <View style={[styles.labelDot, { backgroundColor: item.color }]} />
                      <Text style={styles.labelText} numberOfLines={1}>{item.label}</Text>
                    </View>
                  </View>
                </View>
              </SoftCard>
            </BounceCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  scrollList: { paddingRight: 16, gap: 8 },
  cardOuter: {
    width: 108,
  },
  cardInner: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardWrapper: {
    backgroundColor: '#FFFFFF',
  },
  cardTopAccent: {
    height: 3,
    width: '100%',
  },
  cardBody: {
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  labelText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
});
