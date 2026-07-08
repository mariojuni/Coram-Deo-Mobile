import { useMinistryApplication } from '@/features/serve/presentation/hooks/useMinistryApplication';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryApplicationStore } from '@/store/useMinistryApplicationStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, HandHeart, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Ministry not found</Text>
        </View>
      </View>
    );
  }

  const memberCount = ministry.memberCount ?? ministry.members?.length ?? 0;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerIconRow}>
          <View style={styles.ministryIcon}>
            <Users size={28} color="#FF6596" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ministryName}>{ministry.name}</Text>
            {ministry.leaderName ? (
              <Text style={styles.leaderText}>Led by {ministry.leaderName}</Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview */}
        {ministry.description ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>About</Text>
            <Text style={styles.cardBody}>{ministry.description}</Text>
          </View>
        ) : null}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {memberCount > 0 ? (
            <View style={styles.statCard}>
              <Users size={20} color="#FF6596" />
              <Text style={styles.statValue}>{memberCount}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
          ) : null}
          {ministry.roles?.length > 0 ? (
            <View style={styles.statCard}>
              <CalendarDays size={20} color="#8B6FE8" />
              <Text style={styles.statValue}>{ministry.roles.length}</Text>
              <Text style={styles.statLabel}>Roles</Text>
            </View>
          ) : null}
        </View>

        {/* Roles */}
        {ministry.roles?.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Ministry Roles</Text>
            {ministry.roles.map((role) => (
              <View key={role} style={styles.roleRow}>
                <View style={styles.roleDot} />
                <Text style={styles.roleText}>{role}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* My upcoming assignments for this ministry */}
        {upcomingAssignments.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Your Upcoming Assignments</Text>            {upcomingAssignments.map((a) => {
              const formattedDate = (() => {
                try {
                  const raw = a.eventDate;
                  const d = raw?.length === 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
                  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                } catch { return a.eventDate; }
              })();
              return (
                <View key={a.id} style={styles.assignmentRow}>
                  <View style={styles.assignmentDot} />
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
        ) : null}

        {/* ── Application / Membership status card ── */}
        {!churchId ? null : !memberId ? (
          /* Has church but no member profile linked yet */
          <View style={styles.applyCard}>
            <View style={styles.applyStatusRow}>
              <HandHeart size={22} color="#9CA3AF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.applyStatusTitle}>Member Profile Required</Text>
                <Text style={styles.applyStatusBody}>
                  Your account isn't linked to a member profile yet. Contact your church admin to get linked so you can apply to serve.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.applyCard}>
            {applicationStatus === 'member' || isMember ? (
              /* Already a member */
              <View style={styles.applyStatusRow}>
                <CheckCircle2 size={22} color="#22C55E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.applyStatusTitle}>Already Joined</Text>
                  <Text style={styles.applyStatusBody}>You're already part of this ministry.</Text>
                </View>
              </View>
            ) : applicationStatus === 'pending' ? (
              /* Pending review */
              <>
                <View style={styles.applyStatusRow}>
                  <Clock size={22} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.applyStatusTitle, { color: '#B45309' }]}>Pending Review</Text>
                    <Text style={styles.applyStatusBody}>
                      Your application has been submitted and is awaiting review.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.withdrawBtn}
                  onPress={handleWithdraw}
                  disabled={withdrawing}
                  activeOpacity={0.8}
                >
                  {withdrawing ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Text style={styles.withdrawBtnText}>Withdraw Application</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : applicationStatus === 'approved' ? (
              /* Approved */
              <View style={styles.applyStatusRow}>
                <CheckCircle2 size={22} color="#22C55E" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.applyStatusTitle, { color: '#15803D' }]}>Application Approved</Text>
                  <Text style={styles.applyStatusBody}>Your application has been approved!</Text>
                </View>
              </View>
            ) : applicationStatus === 'declined' || applicationStatus === 'withdrawn' ? (
              /* Declined / Withdrawn — allow re-apply */
              <>
                <View style={styles.applyStatusRow}>
                  <HandHeart size={22} color="#9CA3AF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.applyStatusTitle}>
                      {applicationStatus === 'declined' ? 'Application Declined' : 'Application Withdrawn'}
                    </Text>
                    <Text style={styles.applyStatusBody}>
                      {applicationStatus === 'declined'
                        ? 'Your previous application was declined. You may apply again.'
                        : 'You withdrew your application. You may apply again.'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() =>
                    router.push({ pathname: '/ministry-application', params: { ministryId: id } } as any)
                  }
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FF6596', '#B66DFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.applyGradient}
                  >
                    <Text style={styles.applyBtnText}>Apply to Join</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : canApply ? (
              /* Default — can apply */
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() =>
                  router.push({ pathname: '/ministry-application', params: { ministryId: id } } as any)
                }
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#FF6596', '#B66DFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.applyGradient}
                >
                  <Text style={styles.applyBtnText}>Apply to Join</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FC' },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ministryIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ministryName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  leaderText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  content: {
    padding: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6596',
  },
  roleText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  assignmentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6596',
    flexShrink: 0,
  },
  assignmentEvent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  assignmentMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  assignmentStatus: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  assignmentStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },

  applyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  applyStatusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  applyStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  applyStatusBody: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  applyBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  withdrawBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  withdrawBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },
});
