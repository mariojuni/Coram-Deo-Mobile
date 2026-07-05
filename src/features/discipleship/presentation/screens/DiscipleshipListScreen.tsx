import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useDiscipleshipPlans } from '../hooks/useDiscipleshipPlans';

export function DiscipleshipListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { plans, loading } = useDiscipleshipPlans();

  const headerHeight = Math.max(insets.top, 24) + 85;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

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

        <View style={styles.titleRow}>
          <Text style={styles.title}>Discipleship</Text>
        </View>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <BookOpen size={26} color="#FF6596" />
            </View>
            <Text style={styles.emptyTitle}>No Plans Available</Text>
            <Text style={styles.emptySubtitle}>There are currently no discipleship plans published for your church.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push(`/discipleship/${item.id}` as any)}
          >
            <View style={styles.imageContainer}>
              {item.coverImageUrl ? (
                <Image source={{ uri: item.coverImageUrl }} style={styles.coverImage} />
              ) : (
                <LinearGradient
                  colors={['#FF9EC1', '#CD9EFC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coverImagePlaceholder}
                >
                  <BookOpen size={42} color="#FFFFFF" />
                </LinearGradient>
              )}
            </View>
            
            <View style={styles.cardContent}>
              <Text style={styles.planTitle} numberOfLines={1}>{item.title}</Text>
              {item.subtitle && <Text style={styles.planSubtitle} numberOfLines={1}>{item.subtitle}</Text>}
              
              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <Calendar size={12} color="#FF6596" />
                  <Text style={styles.metaText}>{item.totalWeeks} Weeks</Text>
                </View>
                {item.category && (
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaText}>{item.category}</Text>
                  </View>
                )}
                
                <View style={styles.flexSpacer} />
                <ChevronRight size={18} color="#9CA3AF" />
              </View>
            </View>
          </TouchableOpacity>
        )}
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
  frostedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  titleRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F5F6FA',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 160,
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6FA',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  cardContent: {
    padding: 16,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flexSpacer: {
    flex: 1,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8F0',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6596',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF0F7',
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginTop: 20,
  },
  emptyIconRing: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFE8F0',
    borderWidth: 1,
    borderColor: '#FFCEDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  }
});
