import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Bookmark, BookOpen, Calendar, Users, ShieldCheck } from 'lucide-react-native';
import { SoftCard } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';

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
    },
    {
      key: 'notes' as const,
      label: 'Notes',
      value: stats.notesCount,
      icon: BookOpen,
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
    },
    {
      key: 'plans' as const,
      label: 'Plans',
      value: stats.plansCount,
      icon: Calendar,
      color: '#3B82F6',
      bgColor: '#DBEAFE',
    },
    {
      key: 'groups' as const,
      label: 'Groups',
      value: stats.groupsCount,
      icon: Users,
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
    {
      key: 'ministries' as const,
      label: 'Ministries',
      value: stats.ministriesCount,
      icon: ShieldCheck,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
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
                <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
                  <IconComp size={18} color={item.color} />
                </View>
                <Text style={styles.valueText}>{item.value}</Text>
                <Text style={styles.labelText}>{item.label}</Text>
              </SoftCard>
            </BounceCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  scrollList: { paddingRight: 16, gap: 10 },
  cardOuter: {
    minWidth: 92,
  },
  cardInner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  valueText: { fontSize: 18, fontWeight: '800', color: '#111827' },
  labelText: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 2 },
});
