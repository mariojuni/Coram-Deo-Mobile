import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SoftCard } from '@/components/ui/SoftCard';
import { BookOpen, Edit3, Highlighter, ChevronLeft, ChevronRight, Calendar, Bookmark, BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';
import type { MonthlyBibleActivityMetrics } from '../../domain/myJourney.types';

interface MonthViewProps {
  metrics: MonthlyBibleActivityMetrics;
  prevMetrics: MonthlyBibleActivityMetrics;
  currentMonthDate: Date;
  loading: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function MonthView({
  metrics,
  prevMetrics,
  currentMonthDate,
  loading,
  onPrevMonth,
  onNextMonth,
}: MonthViewProps) {
  const monthName = currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonthName = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1).toLocaleString('default', { month: 'long' });
  const currentOnlyMonthName = currentMonthDate.toLocaleString('default', { month: 'long' });

  // Generate calendar days
  const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
  const startOffset = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).getDay();

  const yyyy = currentMonthDate.getFullYear();
  const mm = String(currentMonthDate.getMonth() + 1).padStart(2, '0');

  const calendarDays = [];
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dd = String(i).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    calendarDays.push({
      day: i,
      isActive: metrics.activityDates.includes(dateKey),
    });
  }

  const now = new Date();
  const isFutureNext = currentMonthDate.getFullYear() === now.getFullYear() && currentMonthDate.getMonth() === now.getMonth();

  if (loading) {
    return (
      <View style={{ paddingTop: 16 }}>
        <ShimmerSkeleton width="100%" height={240} borderRadius={24} style={{ marginBottom: 16 }} />
        <ShimmerSkeleton width="100%" height={160} borderRadius={24} />
      </View>
    );
  }

  const renderTrend = (current: number, prev: number) => {
    if (current > prev) {
      return (
        <View style={[styles.trendBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
          <TrendingUp size={14} color="#10B981" />
          <Text style={[styles.trendText, { color: '#10B981' }]}>+{current - prev}</Text>
        </View>
      );
    } else if (current < prev) {
      return (
        <View style={[styles.trendBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <TrendingDown size={14} color="#EF4444" />
          <Text style={[styles.trendText, { color: '#EF4444' }]}>{current - prev}</Text>
        </View>
      );
    } else {
      return (
        <View style={[styles.trendBadge, { backgroundColor: '#F3F4F6' }]}>
          <Minus size={14} color="#9CA3AF" />
          <Text style={[styles.trendText, { color: '#9CA3AF' }]}>Same</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Merged Stats and Calendar */}
      <SoftCard style={styles.cardSpacing} innerStyle={styles.cardInner}>
        {/* Month Navigation Header */}
        <View style={[styles.monthHeaderRow, { marginBottom: 16 }]}>
          <TouchableOpacity onPress={onPrevMonth} style={styles.navBtnCard} hitSlop={8}>
            <ChevronLeft size={20} color="#111827" />
          </TouchableOpacity>
          <View style={styles.monthTitleWrap}>
            <Calendar size={16} color="#FF6596" style={{ marginRight: 8 }} />
            <Text style={styles.monthTitleCard}>{monthName}</Text>
          </View>
          <TouchableOpacity onPress={onNextMonth} style={[styles.navBtnCard, isFutureNext && { opacity: 0.3 }]} disabled={isFutureNext} hitSlop={8}>
            <ChevronRight size={20} color="#111827" />
          </TouchableOpacity>
        </View>
        
        {/* Calendar Grid */}
        <View style={styles.calendarHeaderRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <Text key={i} style={styles.calHeader}>{day}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {calendarDays.map((calDay, i) => (
            <View key={i} style={styles.calDayWrap}>
              {calDay ? (
                <View style={[styles.calDay, calDay.isActive ? styles.calDayActive : styles.calDayInactive]}>
                  {calDay.isActive ? <View style={styles.calDayActiveInner} /> : null}
                  <Text style={[styles.calDayText, calDay.isActive && styles.calDayTextActive]}>
                    {calDay.day}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={[styles.mergedDivider, { marginTop: 24, marginBottom: 24 }]} />

        {/* Ultra-Compact Stats Row */}
        <View style={styles.compactStatsRow}>
          {/* Reading Days */}
          <View style={styles.compactStatItem}>
            <View style={[styles.compactStatIconWrap, { backgroundColor: 'rgba(255, 101, 150, 0.1)' }]}>
              <Calendar size={18} color="#FF6596" />
            </View>
            <Text style={styles.compactStatValue}>{metrics.readingDaysCount}</Text>
            <Text style={styles.compactStatLabel}>Days</Text>
          </View>

          {/* Chapters */}
          <View style={styles.compactStatItem}>
            <View style={[styles.compactStatIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <BookOpen size={18} color="#3B82F6" />
            </View>
            <Text style={styles.compactStatValue}>{metrics.chaptersReadCount}</Text>
            <Text style={styles.compactStatLabel}>Chap</Text>
          </View>

          {/* Notes */}
          <View style={styles.compactStatItem}>
            <View style={[styles.compactStatIconWrap, { backgroundColor: 'rgba(182, 109, 255, 0.1)' }]}>
              <Edit3 size={18} color="#B66DFF" />
            </View>
            <Text style={styles.compactStatValue}>{metrics.notesCreatedCount}</Text>
            <Text style={styles.compactStatLabel}>Notes</Text>
          </View>

          {/* Highlights */}
          <View style={styles.compactStatItem}>
            <View style={[styles.compactStatIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Highlighter size={18} color="#F59E0B" />
            </View>
            <Text style={styles.compactStatValue}>{metrics.highlightsCreatedCount}</Text>
            <Text style={styles.compactStatLabel}>Highs</Text>
          </View>
        </View>
      </SoftCard>

      {/* Most Engaged Book */}
      {metrics.mostEngagedBook && (
        <SoftCard style={styles.cardSpacing} innerStyle={styles.cardInner}>
          <View style={styles.sectionHeaderWrap}>
            <Bookmark size={16} color="#FF6596" />
            <Text style={styles.sectionOverline}>MOST ENGAGED BOOK</Text>
          </View>
          <Text style={styles.bookTitle}>{metrics.mostEngagedBook.bookName}</Text>
          <Text style={styles.bookDesc}>{metrics.mostEngagedBook.chapterCount} meaningful chapter engagements</Text>
        </SoftCard>
      )}

      {/* Month Comparison */}
      <SoftCard style={styles.cardSpacing} innerStyle={styles.cardInner}>
        <View style={styles.sectionHeaderWrap}>
          <BarChart2 size={16} color="#FF6596" />
          <Text style={styles.sectionOverline}>MONTH COMPARISON</Text>
        </View>
        
        <View style={styles.compHeader}>
          <Text style={styles.compLabelHeader}>{currentOnlyMonthName}</Text>
          <Text style={styles.compLabelHeader}>{prevMonthName}</Text>
        </View>

        <View style={styles.compRow}>
          <Text style={styles.compLabelCenter}>Reading Days</Text>
          <View style={styles.compTrendWrap}>
            <Text style={styles.compValLeft}>{metrics.readingDaysCount}</Text>
            {renderTrend(metrics.readingDaysCount, prevMetrics.readingDaysCount)}
          </View>
        </View>
        <View style={styles.compRow}>
          <Text style={styles.compLabelCenter}>Chapters</Text>
          <View style={styles.compTrendWrap}>
            <Text style={styles.compValLeft}>{metrics.chaptersReadCount}</Text>
            {renderTrend(metrics.chaptersReadCount, prevMetrics.chaptersReadCount)}
          </View>
        </View>
        <View style={styles.compRow}>
          <Text style={styles.compLabelCenter}>Notes</Text>
          <View style={styles.compTrendWrap}>
            <Text style={styles.compValLeft}>{metrics.notesCreatedCount}</Text>
            {renderTrend(metrics.notesCreatedCount, prevMetrics.notesCreatedCount)}
          </View>
        </View>
        <View style={styles.compRow}>
          <Text style={styles.compLabelCenter}>Highlights</Text>
          <View style={styles.compTrendWrap}>
            <Text style={styles.compValLeft}>{metrics.highlightsCreatedCount}</Text>
            {renderTrend(metrics.highlightsCreatedCount, prevMetrics.highlightsCreatedCount)}
          </View>
        </View>

      </SoftCard>
      
      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  cardInner: {
    padding: 24,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navBtnCard: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTitleCard: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.5,
    marginLeft: 6,
  },
  compactStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  compactStatItem: {
    alignItems: 'center',
    width: '22%',
  },
  compactStatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  compactStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  compactStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  mergedDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 24,
    marginHorizontal: -8,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayWrap: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  calDay: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayActive: {
    backgroundColor: 'rgba(255, 117, 158, 0.15)',
  },
  calDayActiveInner: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF759E',
  },
  calDayInactive: {
    backgroundColor: 'transparent',
  },
  calDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  calDayTextActive: {
    color: '#FF759E',
    fontWeight: '800',
  },
  bookTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  bookDesc: {
    fontSize: 14,
    color: '#6B7280',
  },
  compHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  compLabelHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    width: 60,
    textAlign: 'center',
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  compValLeft: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    width: 60,
    textAlign: 'center',
  },
  compValRight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280', // slightly muted
    width: 60,
    textAlign: 'center',
  },
  compLabelCenter: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  compTrendWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 100,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  }
});
