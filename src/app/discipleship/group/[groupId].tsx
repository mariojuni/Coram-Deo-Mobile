import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Crown,
  MapPin,
  Megaphone,
  MessageSquare,
  Plus,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BounceCard } from '../../../components/ui/BounceCard';
import { SoftCard } from '../../../components/ui/SoftCard';
import { useAuthStore } from '../../../store/useAuthStore';
import { useMemberStore } from '../../../store/useMemberStore';
import { useDiscipleshipGroupStore } from '../../../store/useDiscipleshipGroupStore';
import { LeaderToolsModal } from '../../../features/discipleshipGroup/presentation/components/LeaderToolsModal';
import {
  canManageDiscipleshipGroup,
  canViewDiscipleshipGroup,
} from '../../../permissions/discipleshipGroupPermissions';

export default function DiscipleshipGroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userProfile = useAuthStore((state) => state.userProfile);
  const members = useMemberStore((state) => state.members);

  const {
    activeGroup: group,
    activePlan: plan,
    activeLessons: lessons,
    activeGroupLoading: loading,
    groupProgress: progressList,
    groupPosts: posts,
    loadGroupDetails,
    subscribeToGroupDetails,
    createPost,
    clearActiveGroup,
  } = useDiscipleshipGroupStore();

  const [leaderToolsOpen, setLeaderToolsOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [newPostModalOpen, setNewPostModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'discussion' | 'reflection' | 'prayer'>('discussion');
  const [posting, setPosting] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const titleOpacity = scrollY.interpolate({
    inputRange: [50, 110],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const rosterFadeAnim = useRef(new Animated.Value(0)).current;
  const rosterSlideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (membersModalOpen) {
      Animated.parallel([
        Animated.timing(rosterFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(rosterSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      rosterSlideAnim.setValue(600);
      rosterFadeAnim.setValue(0);
    }
  }, [membersModalOpen]);

  useEffect(() => {
    if (groupId && userProfile?.churchId) {
      loadGroupDetails(userProfile.churchId, groupId);
      const unsub = subscribeToGroupDetails(userProfile.churchId, groupId);
      return () => {
        unsub();
        clearActiveGroup();
      };
    }
  }, [groupId, userProfile?.churchId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6596" />
        <Text style={styles.loadingText}>Loading group details…</Text>
      </View>
    );
  }

  if (!group || !userProfile) {
    return (
      <View style={styles.centerContainer}>
        <ShieldAlert size={36} color="#EF4444" />
        <Text style={styles.errorTitle}>Group Not Found</Text>
        <Text style={styles.errorSubtitle}>We could not load your group. Please try again.</Text>
        <TouchableOpacity style={styles.backButtonBtn} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!canViewDiscipleshipGroup(userProfile, group)) {
    return (
      <View style={styles.centerContainer}>
        <ShieldAlert size={36} color="#F59E0B" />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorSubtitle}>You do not have permission to view this group.</Text>
        <TouchableOpacity style={styles.backButtonBtn} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLeader = canManageDiscipleshipGroup(userProfile, group);

  const groupLeaders = group.leaderMemberIds
    .map((mId) => members.find((m) => m.id === mId))
    .filter(Boolean);

  const groupMembersList = group.memberIds
    .map((mId) => members.find((m) => m.id === mId))
    .filter(Boolean);

  // Current lesson & member progress
  const currentMemberId = userProfile.memberId;
  const userProgress = progressList.filter((p) => p.memberId === currentMemberId);
  const completedLessonIds = new Set(userProgress.filter((p) => p.isCompleted).map((p) => p.lessonId));

  const currentLesson = (group.currentLessonId ? lessons.find((l) => l.id === group.currentLessonId) : null) ||
    (group.currentWeekNumber ? lessons.find((l) => l.weekNumber === group.currentWeekNumber) : null) ||
    lessons.find((l) => !completedLessonIds.has(l.id)) ||
    lessons[0];

  const progressPercent = lessons.length > 0
    ? Math.round((completedLessonIds.size / lessons.length) * 100)
    : 0;

  const currentWeekNum = group.currentWeekNumber || currentLesson?.weekNumber || 1;
  const previousLessons = lessons
    .filter((l) => l.weekNumber < currentWeekNum)
    .sort((a, b) => a.weekNumber - b.weekNumber);

  const handleCreatePost = async () => {
    if (!postContent.trim() || !userProfile.churchId || !userProfile.uid) return;
    setPosting(true);
    try {
      await createPost({
        churchId: userProfile.churchId,
        groupId: group.id,
        authorUserId: userProfile.uid,
        authorMemberId: userProfile.memberId || undefined,
        authorName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Member',
        authorPhotoUrl: userProfile.photoUrl,
        type: postType,
        content: postContent.trim(),
      });
      setPostContent('');
      setNewPostModalOpen(false);
      Alert.alert('Posted!', 'Your message has been shared with the group.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to post message.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Frosted Header */}
      <View style={[styles.frostedHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconCircleBtn}>
          <ArrowLeft size={18} color="#111827" />
        </TouchableOpacity>
        <Animated.View style={{ flex: 1, opacity: titleOpacity }}>
          <Text style={styles.headerOverline}>
            {group.groupType ? group.groupType.replace('_', ' ').toUpperCase() : 'DISCIPLESHIP GROUP'}
          </Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {group.name}
          </Text>
        </Animated.View>
        {isLeader && (
          <TouchableOpacity
            style={styles.leaderToolsBadge}
            onPress={() => setLeaderToolsOpen(true)}
          >
            <UserCheck size={14} color="#FFFFFF" />
            <Text style={styles.leaderToolsBadgeText}>Tools</Text>
          </TouchableOpacity>
        )}
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Card */}
        <SoftCard innerStyle={styles.heroCardInner}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTypeTag}>
              {group.groupType.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.heroTitle}>{group.name}</Text>
            {group.description ? (
              <Text style={styles.heroDescription}>{group.description}</Text>
            ) : null}

            {/* Meta Row */}
            <View style={styles.heroMetaRow}>
              {(group.meetingDay || group.meetingTime) && (
                <View style={styles.heroMetaPill}>
                  <Calendar size={12} color="#FFFFFF" />
                  <Text style={styles.heroMetaPillText}>
                    {group.meetingDay} {group.meetingTime}
                  </Text>
                </View>
              )}
              {group.meetingLocation && (
                <View style={styles.heroMetaPill}>
                  <MapPin size={12} color="#FFFFFF" />
                  <Text style={styles.heroMetaPillText}>{group.meetingLocation}</Text>
                </View>
              )}
            </View>
          </View>
        </SoftCard>

        {/* Current Plan & Progress Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeading}>Discipleship Plan</Text>
            <Text style={styles.progressPercentText}>{progressPercent}% Complete</Text>
          </View>

          {plan || group.planTitle ? (
            <View>
              <SoftCard innerStyle={styles.planCardInner}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.planCardHeader}
                  onPress={() => {
                    const targetLessonId = currentLesson?.id || group.currentLessonId || (lessons.length > 0 ? lessons[0].id : null);
                    const effectivePlanId = group.planId || plan?.id || (currentLesson as any)?.planId || (lessons.length > 0 ? lessons[0].planId : null);
                    if (isLeader && effectivePlanId && targetLessonId) {
                      router.push(`/discipleship/week/${targetLessonId}?planId=${effectivePlanId}&groupId=${group.id}` as any);
                    } else if (targetLessonId) {
                      router.push(`/discipleship/group/${group.id}/lesson/${targetLessonId}` as any);
                    } else {
                      Alert.alert('Notice', 'Lesson content is currently being loaded.');
                    }
                  }}
                >
                  <View style={styles.planIconWrap}>
                    <BookOpen size={20} color="#FF6596" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle}>{plan?.title || group.planTitle}</Text>
                    <Text style={styles.planSubtitle}>
                      {lessons.length > 0
                        ? Math.max(lessons.length, ...lessons.map((l) => l.weekNumber || 0))
                        : (plan?.totalWeeks || 0)}{' '}
                      Weeks • Current: Week {group.currentWeekNumber || currentLesson?.weekNumber || 1}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>

                {currentLesson ? (
                  <View style={styles.currentLessonBox}>
                    <Text style={styles.currentLessonLabel}>CURRENT LESSON</Text>
                    <Text style={styles.currentLessonTitle}>
                      Wk {currentLesson.weekNumber}: {currentLesson.title}
                    </Text>
                    {currentLesson.scriptureReference ? (
                      <Text style={styles.currentLessonScripture}>
                        {currentLesson.scriptureReference}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.emptyLessonText}>No lesson is assigned to this group yet.</Text>
                )}

                {/* Member Leader-Material Facilitation Banner */}
                {!isLeader && (
                  <View style={{ backgroundColor: '#FFF5F8', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FFE2EC', marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#BE185D', fontStyle: 'italic', textAlign: 'center' }}>
                      “This week’s material will be facilitated by your group leader.”
                    </Text>
                  </View>
                )}

                {/* Past Lessons List */}
                {previousLessons.length > 0 && (
                  <View style={styles.previousLessonsCardBox}>
                    <Text style={styles.previousLessonsCardLabel}>PAST LESSONS</Text>
                    {previousLessons.map((prevLesson) => {
                      const isCompleted = completedLessonIds.has(prevLesson.id);

                      return (
                        <TouchableOpacity
                          key={prevLesson.id}
                          style={styles.previousLessonCardRow}
                          onPress={() => {
                            const effectivePlanId = group.planId || plan?.id || (prevLesson as any)?.planId || (lessons.length > 0 ? lessons[0].planId : null);
                            if (isLeader && effectivePlanId) {
                              router.push(`/discipleship/week/${prevLesson.id}?planId=${effectivePlanId}&groupId=${group.id}` as any);
                            } else {
                              router.push(`/discipleship/group/${group.id}/lesson/${prevLesson.id}` as any);
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <CheckCircle2 size={15} color={isCompleted ? '#10B981' : '#9CA3AF'} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.previousLessonCardTitle} numberOfLines={1}>
                              Wk {prevLesson.weekNumber}: {prevLesson.title}
                            </Text>
                            {prevLesson.scriptureReference ? (
                              <Text style={styles.previousLessonCardScripture} numberOfLines={1}>
                                {prevLesson.scriptureReference}
                              </Text>
                            ) : null}
                          </View>
                          <ChevronRight size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>

                {/* Actions */}
                <View style={styles.planActionRow}>
                  {currentLesson && (
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => {
                        const targetLessonId = currentLesson?.id || group.currentLessonId || (lessons.length > 0 ? lessons[0].id : null);
                        const effectivePlanId = group.planId || plan?.id || (currentLesson as any)?.planId || (lessons.length > 0 ? lessons[0].planId : null);
                        if (isLeader && effectivePlanId && targetLessonId) {
                          router.push(`/discipleship/week/${targetLessonId}?planId=${effectivePlanId}&groupId=${group.id}` as any);
                        } else if (targetLessonId) {
                          router.push(`/discipleship/group/${group.id}/lesson/${targetLessonId}` as any);
                        }
                      }}
                    >
                      <Text style={styles.primaryActionBtnText}>View Current Lesson</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </SoftCard>
            </View>
          ) : (
            <SoftCard innerStyle={styles.emptyCardInner}>
              <Text style={styles.emptyLessonText}>No discipleship plan is currently attached to this group.</Text>
            </SoftCard>
          )}
        </View>

        {/* Leaders & Members Quick Glance */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeading}>Group Members</Text>
            <TouchableOpacity onPress={() => setMembersModalOpen(true)}>
              <Text style={styles.seeAllText}>View All ({groupMembersList.length + groupLeaders.length})</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
            {groupLeaders.map((m: any) => (
              <View key={`leader-${m.id}`} style={styles.memberAvatarWrap}>
                <Image
                  source={{
                    uri:
                      m.photoUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(m.firstName + ' ' + m.lastName)}&background=FF6596&color=fff`,
                  }}
                  style={styles.memberAvatar}
                />
                <View style={styles.leaderBadgeDot}>
                  <Text style={styles.leaderBadgeDotText}>L</Text>
                </View>
                <Text style={styles.memberAvatarName} numberOfLines={1}>
                  {m.firstName}
                </Text>
              </View>
            ))}

            {groupMembersList.map((m: any) => (
              <View key={`mem-${m.id}`} style={styles.memberAvatarWrap}>
                <Image
                  source={{
                    uri:
                      m.photoUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(m.firstName + ' ' + m.lastName)}&background=f0f0f0&color=999`,
                  }}
                  style={styles.memberAvatar}
                />
                <Text style={styles.memberAvatarName} numberOfLines={1}>
                  {m.firstName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Group Discussions & Announcements */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeading}>Announcements & Feed</Text>
            <TouchableOpacity
              style={styles.postBtn}
              onPress={() => setNewPostModalOpen(true)}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.postBtnText}>Post</Text>
            </TouchableOpacity>
          </View>

          {posts.length === 0 ? (
            <SoftCard innerStyle={styles.emptyCardInner}>
              <MessageSquare size={24} color="#9CA3AF" />
              <Text style={styles.emptyLessonText}>No group posts or announcements yet.</Text>
            </SoftCard>
          ) : (
            posts.map((post) => (
              <SoftCard key={post.id} innerStyle={styles.postCardInner} style={{ marginBottom: 10 }}>
                <View style={styles.postTopRow}>
                  <View style={styles.postAuthorWrap}>
                    <Image
                      source={{
                        uri:
                          post.authorPhotoUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'Member')}&background=f0f0f0&color=999`,
                      }}
                      style={styles.postAuthorAvatar}
                    />
                    <View>
                      <Text style={styles.postAuthorName}>{post.authorName || 'Group Member'}</Text>
                      <Text style={styles.postTypeTag}>{post.type.toUpperCase()}</Text>
                    </View>
                  </View>
                  {post.type === 'announcement' && (
                    <View style={styles.announcementTag}>
                      <Megaphone size={12} color="#B66DFF" />
                    </View>
                  )}
                </View>

                <Text style={styles.postContent}>{post.content}</Text>
              </SoftCard>
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Leader Tools Modal */}
      <LeaderToolsModal
        visible={leaderToolsOpen}
        onClose={() => setLeaderToolsOpen(false)}
        group={group}
        lessons={lessons}
      />

      {/* Members Modal */}
      <Modal visible={membersModalOpen} animationType="none" transparent onRequestClose={() => setMembersModalOpen(false)}>
        <View style={styles.backdrop}>
          <Animated.View style={[styles.darkOverlay, { opacity: rosterFadeAnim }]}>
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFill}
              onPress={() => setMembersModalOpen(false)}
            />
          </Animated.View>
          <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: rosterSlideAnim }] }]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOverline}>GROUP ROSTER</Text>
                <Text style={styles.sheetTitle} numberOfLines={1}>{group.name}</Text>
              </View>
              <BounceCard bounceScale={0.85} style={styles.sheetHeaderCircle} onPress={() => setMembersModalOpen(false)} activeOpacity={0.8} hitSlop={8}>
                <X size={20} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
              {groupLeaders.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={styles.rosterSectionLabel}>LEADERS ({groupLeaders.length})</Text>
                  {groupLeaders.map((m: any) => (
                    <View key={`roster-l-${m.id}`} style={styles.rosterRowCard}>
                      <Image source={{ uri: m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((m.firstName || '') + ' ' + (m.lastName || ''))}` }} style={styles.rosterAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rosterName}>{m.firstName} {m.lastName}</Text>
                        <Text style={styles.rosterRoleSub}>{m.email || 'Group Leader'}</Text>
                      </View>
                      <View style={styles.leaderPill}>
                        <Crown size={12} color="#FF6596" />
                        <Text style={styles.leaderPillText}>Leader</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ gap: 8 }}>
                <Text style={styles.rosterSectionLabel}>MEMBERS ({groupMembersList.length})</Text>
                {groupMembersList.map((m: any) => (
                  <View key={`roster-m-${m.id}`} style={styles.rosterRowCard}>
                    <Image source={{ uri: m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((m.firstName || '') + ' ' + (m.lastName || ''))}` }} style={styles.rosterAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rosterName}>{m.firstName} {m.lastName}</Text>
                      <Text style={styles.rosterRoleSub}>Member</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* New Post Modal */}
      <Modal visible={newPostModalOpen} animationType="fade" transparent onRequestClose={() => setNewPostModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={styles.postModalContainer}>
            <Text style={styles.sheetTitle}>New Group Post</Text>
            <View style={styles.postTypeRow}>
              {(['discussion', 'reflection', 'prayer'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.postTypeChip, postType === t && styles.postTypeChipActive]}
                  onPress={() => setPostType(t)}
                >
                  <Text style={[styles.postTypeChipText, postType === t && styles.postTypeChipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.postTextArea}
              multiline
              numberOfLines={4}
              placeholder="Share thoughts, prayer requests, or reflections with your group..."
              placeholderTextColor="#9CA3AF"
              value={postContent}
              onChangeText={setPostContent}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewPostModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitPostBtn, (!postContent.trim() || posting) && { opacity: 0.5 }]}
                onPress={handleCreatePost}
                disabled={!postContent.trim() || posting}
              >
                {posting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitPostBtnText}>Post</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  errorSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  backButtonBtn: { backgroundColor: '#FF6596', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 8 },
  backButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  frostedHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconCircleBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerOverline: { fontSize: 10, fontWeight: '800', color: '#FF6596', letterSpacing: 1.2 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  leaderToolsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#B66DFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  leaderToolsBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  content: { paddingHorizontal: 20, paddingBottom: 100, gap: 16 },

  heroCardInner: { borderRadius: 20, overflow: 'hidden', padding: 20, minHeight: 130 },
  heroContent: { gap: 6 },
  heroTypeTag: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  heroDescription: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  heroMetaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  heroMetaPillText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },

  section: { gap: 10 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeading: { fontSize: 18, fontWeight: '800', color: '#111827' },
  progressPercentText: { fontSize: 12, fontWeight: '700', color: '#FF6596' },
  seeAllText: { fontSize: 12, fontWeight: '600', color: '#8B5CF6' },

  planCardInner: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 12 },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE8F1', alignItems: 'center', justifyContent: 'center' },
  planTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  planSubtitle: { fontSize: 12, color: '#6B7280' },
  currentLessonBox: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: '#F3F4F6' },
  currentLessonLabel: { fontSize: 10, fontWeight: '800', color: '#FF6596', letterSpacing: 0.8 },
  currentLessonTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  currentLessonScripture: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  previousLessonsCardBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#F3F4F6', marginTop: 4 },
  previousLessonsCardLabel: { fontSize: 10, fontWeight: '800', color: '#6B7280', letterSpacing: 0.8 },
  previousLessonCardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  previousLessonCardTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  previousLessonCardScripture: { fontSize: 11, color: '#6B7280', fontStyle: 'italic', marginTop: 1 },
  progressBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FF6596', borderRadius: 3 },
  planActionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  primaryActionBtn: { backgroundColor: '#FF6596', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  primaryActionBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  emptyCardInner: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyLessonText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  membersRow: { gap: 12, paddingVertical: 4 },
  memberAvatarWrap: { alignItems: 'center', gap: 4, width: 56 },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF' },
  leaderBadgeDot: { position: 'absolute', top: 0, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FF6596', alignItems: 'center', justifyContent: 'center' },
  leaderBadgeDotText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  memberAvatarName: { fontSize: 11, color: '#374151', textAlign: 'center' },

  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF6596', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  postBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  postCardInner: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 8 },
  postTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postAuthorWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postAuthorAvatar: { width: 32, height: 32, borderRadius: 16 },
  postAuthorName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  postTypeTag: { fontSize: 9, fontWeight: '800', color: '#8B5CF6' },
  announcementTag: { backgroundColor: '#F3E8FF', padding: 6, borderRadius: 12 },
  postContent: { fontSize: 14, color: '#374151', lineHeight: 20 },

  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.2,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  sheetHeaderCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterSectionLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 1 },
  rosterRowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  rosterAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' },
  rosterName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rosterRoleSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  leaderPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF5F8', borderColor: '#FFE2EC', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  leaderPillText: { fontSize: 11, fontWeight: '700', color: '#BE185D' },

  postModalContainer: { backgroundColor: '#FFFFFF', margin: 20, borderRadius: 20, padding: 20, gap: 14 },
  postTypeRow: { flexDirection: 'row', gap: 8 },
  postTypeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB' },
  postTypeChipActive: { backgroundColor: '#FF6596', borderColor: '#FF6596' },
  postTypeChipText: { fontSize: 12, color: '#4B5563' },
  postTypeChipTextActive: { color: '#FFF', fontWeight: '700' },
  postTextArea: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, minHeight: 90, textAlignVertical: 'top', fontSize: 14, color: '#111827' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  cancelBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  submitPostBtn: { backgroundColor: '#FF6596', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  submitPostBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
