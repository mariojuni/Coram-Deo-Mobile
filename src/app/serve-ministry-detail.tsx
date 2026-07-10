import { useMinistryApplication } from '@/features/serve/presentation/hooks/useMinistryApplication';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryApplicationStore } from '@/store/useMinistryApplicationStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, Clock, HandHeart, Users, User, X, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState, useRef } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ServeMinistryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const ministries = useMinistryStore((s) => s.ministries);
  const memberAssignments = useMinistryStore((s) => s.memberAssignments);
  const { withdrawApplication } = useMinistryApplicationStore();
  const [withdrawing, setWithdrawing] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerHeight = Math.max(insets.top, 20) + 60;

  const {
    applicationStatus,
    existingApplication,
    canApply,
    isMember,
    churchId,
    memberId,
  } = useMinistryApplication(id ?? '');

  const ministry = ministries.find((m) => m.id === id);

  const upcomingAssignments = memberAssignments.filter((a) => {
    if (a.ministryId !== id) return false;
    const statusNorm = (a.status ?? '').toLowerCase();
    if (statusNorm === 'cancelled' || statusNorm === 'completed') return false;
    try {
      const raw = a.eventDate;
      const d = raw?.length === 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
      return d >= new Date();
    } catch {
      return false;
    }
  });

  const handleWithdraw = () => {
    if (!existingApplication) return;
    Alert.alert(
      'Withdraw Application',
      'Are you sure you want to withdraw your application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            setWithdrawing(true);
            try {
              await withdrawApplication(existingApplication.id);
              Alert.alert('Done', 'Application withdrawn.');
            } catch {
              Alert.alert('Error', 'Failed to withdraw. Please try again.');
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  if (!ministry) {
    return (
      <View style={[styles.screen, { backgroundColor: '#FAFAFA' }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.notFoundTitle}>Ministry not found</Text>
          <Text style={styles.notFoundText}>
            This ministry may have been removed or is no longer available.
          </Text>
        </View>
      </View>
    );
  }

  const memberCount = ministry.memberCount ?? ministry.members?.length ?? 0;

  // Determine if we need to show a sticky footer action
  const showWithdrawAction = churchId && memberId && applicationStatus === 'pending';
  const showApplyAction = churchId && memberId && (applicationStatus === 'declined' || applicationStatus === 'withdrawn' || canApply);
  const hasStickyFooter = showWithdrawAction || showApplyAction;

  return (
    <View style={styles.screen}>
      {/* ─── Animated Blur Header ─── */}
      <View style={[styles.header, { height: headerHeight }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]} pointerEvents="none">
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.75)' }]} />
          {/* Gradient accent line */}
          <View style={styles.accentLine}>
            <LinearGradient
              colors={['#FF6596', '#B66DFF', '#6DC8FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          {/* subtle bottom border that fades in */}
          <View style={styles.headerBorder} />
        </Animated.View>

        <View style={[styles.headerContent, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <ArrowLeft size={22} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          { 
            paddingTop: headerHeight + 10, 
            paddingBottom: hasStickyFooter ? insets.bottom + 120 : insets.bottom + 40 
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Section ─── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#FFE8F1', '#F5F2FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.badgeWrapper}>
            <Users size={16} color="#FF6596" />
            <Text style={styles.badgeText}>Ministry</Text>
          </View>
          <Text style={styles.heroMinistryName}>{ministry.name}</Text>
          {ministry.leaderName ? (
            <Text style={styles.heroLeaderText}>Led by {ministry.leaderName}</Text>
          ) : null}
        </View>

        {/* ─── Status Banners ─── */}
        {!churchId ? null : !memberId ? (
          <View style={[styles.banner, { backgroundColor: '#F3F4F6' }]}>
            <HandHeart size={20} color="#6B7280" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Member Profile Required</Text>
              <Text style={styles.bannerBody}>
                Your account isn't linked to a member profile yet. Contact your church admin to get linked so you can apply to serve.
              </Text>
            </View>
          </View>
        ) : applicationStatus === 'member' || isMember ? (
          <View style={[styles.banner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1 }]}>
            <CheckCircle2 size={20} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: '#059669' }]}>Already Joined</Text>
              <Text style={[styles.bannerBody, { color: '#064E3B' }]}>You're already part of this ministry.</Text>
            </View>
          </View>
        ) : applicationStatus === 'pending' ? (
          <View style={[styles.banner, { backgroundColor: '#FFF8E7', borderColor: '#FDE68A', borderWidth: 1 }]}>
            <Clock size={20} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: '#B45309' }]}>Pending Review</Text>
              <Text style={[styles.bannerBody, { color: '#78350F' }]}>
                Your application has been submitted and is awaiting review.
              </Text>
            </View>
          </View>
        ) : applicationStatus === 'approved' ? (
          <View style={[styles.banner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1 }]}>
            <CheckCircle2 size={20} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: '#059669' }]}>Application Approved</Text>
              <Text style={[styles.bannerBody, { color: '#064E3B' }]}>Your application has been approved!</Text>
            </View>
          </View>
        ) : applicationStatus === 'declined' || applicationStatus === 'withdrawn' ? (
          <View style={[styles.banner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 }]}>
            <X size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: '#B91C1C' }]}>
                {applicationStatus === 'declined' ? 'Application Declined' : 'Application Withdrawn'}
              </Text>
              <Text style={[styles.bannerBody, { color: '#7F1D1D' }]}>
                {applicationStatus === 'declined'
                  ? 'Your previous application was declined. You may apply again.'
                  : 'You withdrew your application. You may apply again.'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ─── Overview ─── */}
        {ministry.description ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.cardBody}>{ministry.description}</Text>
          </View>
        ) : null}

        {/* ─── Stats row ─── */}
        <View style={styles.statsRow}>
          {memberCount > 0 ? (
            <View style={styles.statCard}>
              <View style={[styles.iconWrapper, { backgroundColor: '#FFE8F0' }]}>
                <Users size={20} color="#FF6596" />
              </View>
              <Text style={styles.statValue}>{memberCount}</Text>
              <Text style={styles.statLabel}>Total Members</Text>
            </View>
          ) : null}
          {ministry.roles?.length > 0 ? (
            <View style={styles.statCard}>
              <View style={[styles.iconWrapper, { backgroundColor: '#F3EEFF' }]}>
                <CalendarDays size={20} color="#8B6FE8" />
              </View>
              <Text style={styles.statValue}>{ministry.roles.length}</Text>
              <Text style={styles.statLabel}>Roles</Text>
            </View>
          ) : null}
        </View>

        {/* ─── Members ─── */}
        {ministry.members && ministry.members.length > 0 ? (
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.collapsibleHeader} 
              onPress={() => setMembersExpanded(!membersExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Members</Text>
              {membersExpanded ? (
                <ChevronUp size={20} color="#9CA3AF" />
              ) : (
                <ChevronDown size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
            
            {membersExpanded && (
              <View style={[styles.listContainer, { marginTop: 12 }]}>
                {ministry.members.map((member) => (
                  <View key={member.memberId} style={styles.memberRow}>
                    <View style={[styles.avatar, { backgroundColor: '#F3EEFF' }]}>
                      <User size={18} color="#8B6FE8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{member.memberName}</Text>
                      {member.role ? (
                        <Text style={styles.memberRole}>{member.role}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* ─── Roles ─── */}
        {ministry.roles?.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ministry Roles</Text>
            <View style={styles.listContainer}>
              {ministry.roles.map((role, i) => {
                const roleLabel = typeof role === 'string' ? role : (role as any)?.name ?? String(role);
                return (
                  <View key={roleLabel || i} style={styles.infoRow}>
                    <View style={[styles.smallIconWrapper, { backgroundColor: '#F3EEFF' }]}>
                      <User size={16} color="#8B6FE8" />
                    </View>
                    <Text style={styles.infoValue}>{roleLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ─── My upcoming assignments for this ministry ─── */}
        {upcomingAssignments.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Upcoming Assignments</Text>            
            <View style={styles.listContainer}>
              {upcomingAssignments.map((a) => {
                const formattedDate = (() => {
                  try {
                    const raw = a.eventDate;
                    const d = raw?.length === 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
                    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  } catch { return a.eventDate; }
                })();
                return (
                  <View key={a.id} style={styles.assignmentRow}>
                    <View style={[styles.smallIconWrapper, { backgroundColor: '#E8F0FF' }]}>
                      <CalendarDays size={16} color="#4D8BFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.assignmentEvent} numberOfLines={1}>{a.eventName}</Text>
                      <Text style={styles.assignmentMeta}>{a.roleName} · {formattedDate}</Text>
                    </View>
                    <View
                      style={[
                        styles.assignmentStatus,
                        {
                          backgroundColor:
                            (a.status ?? '').toLowerCase() === 'confirmed'
                              ? '#ECFDF5'
                              : (a.status ?? '').toLowerCase() === 'declined'
                              ? '#FEF2F2'
                              : '#FFF8E7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.assignmentStatusText,
                          {
                            color:
                              (a.status ?? '').toLowerCase() === 'confirmed'
                                ? '#22C55E'
                                : (a.status ?? '').toLowerCase() === 'declined'
                                ? '#EF4444'
                                : '#F59E0B',
                          },
                        ]}
                      >
                        {a.status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* ─── Sticky Footer Actions ─── */}
      {hasStickyFooter && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.85)' }]} pointerEvents="none" />
          
          <View style={styles.actions}>
            {showWithdrawAction && (
              <TouchableOpacity
                style={styles.withdrawBtn}
                onPress={handleWithdraw}
                disabled={withdrawing}
                activeOpacity={0.7}
              >
                {withdrawing ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text style={styles.withdrawBtnText}>Withdraw Application</Text>
                )}
              </TouchableOpacity>
            )}

            {showApplyAction && (
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/ministry-application', params: { ministryId: id } } as any)}
                activeOpacity={0.85}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#FF6596', '#B66DFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyBtn}
                >
                  <Text style={styles.applyBtnText}>Apply to Join</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },
  
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
  },
  headerBorder: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  accentLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },

  content: {
    padding: 20,
    gap: 16,
  },
  
  heroCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
    gap: 12,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFE8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#FF6596',
  },
  heroMinistryName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  heroLeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.2,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 16,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: -4,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cardBody: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContainer: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: -0.2,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  memberRole: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },

  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  assignmentEvent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  assignmentMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  assignmentStatus: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  assignmentStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  withdrawBtn: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  withdrawBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 18,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  notFoundText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

