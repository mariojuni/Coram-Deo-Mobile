import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Music, ChevronRight, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorshipStore } from '../../store/useWorshipStore';

import { SoftCard } from '@/components/ui/SoftCard';

export default function WorshipTab() {
  const router = useRouter();
  const userProfile = useAuthStore(s => s.userProfile);
  const { setlists, setlistsLoading, initializeSetlistsListener } = useWorshipStore();

  useEffect(() => {
    if (!userProfile?.churchId) return;
    const unsubscribe = initializeSetlistsListener(userProfile.churchId);
    return () => unsubscribe();
  }, [userProfile?.churchId, initializeSetlistsListener]);

  if (setlistsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  if (setlists.length === 0) {
    return (
      <View>
        <SoftCard style={{ borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Music size={32} color="#FF6596" />
            </View>
            <Text style={styles.emptyTitle}>No Setlists Found</Text>
            <Text style={styles.emptyText}>Create setlists in the Web Admin portal to see them here.</Text>
          </View>
        </SoftCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={setlists}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 0 }}
        renderItem={({ item }) => (
          <SoftCard style={{ borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push({ pathname: '/serve-worship-setlist', params: { eventId: item.eventId } } as any)}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.title}>{item.title}</Text>
                  <View style={styles.dateRow}>
                    <Calendar size={14} color="#666" style={{ marginRight: 4 }} />
                    <Text style={styles.dateText}>
                      {item.serviceDate ? new Date(item.serviceDate + 'T00:00:00').toLocaleDateString() : 'No date'}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#999" />
              </View>
            </TouchableOpacity>
          </SoftCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    padding: 32,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: '#666',
  },
});
