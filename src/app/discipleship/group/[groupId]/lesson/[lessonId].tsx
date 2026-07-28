import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  Quote,
  Save,
  ShieldAlert,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BounceCard } from '../../../../../components/ui/BounceCard';
import { SoftCard } from '../../../../../components/ui/SoftCard';
import { useAuthStore } from '../../../../../store/useAuthStore';
import { useDiscipleshipGroupStore } from '../../../../../store/useDiscipleshipGroupStore';
import { canViewGroupLesson } from '../../../../../permissions/discipleshipGroupPermissions';
import type { DiscipleshipLesson } from '../../../../../features/discipleshipGroup/domain/discipleshipGroup.types';

export default function DiscipleshipLessonDetailScreen() {
  const { groupId, lessonId } = useLocalSearchParams<{ groupId: string; lessonId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userProfile = useAuthStore((state) => state.userProfile);

  const {
    activeGroup: group,
    activePlan: plan,
    activeLessons: lessons,
    activeGroupLoading: loading,
    groupProgress: progressList,
    loadGroupDetails,
    subscribeToGroupDetails,
    saveMemberProgress,
  } = useDiscipleshipGroupStore();

  const [fetchedLesson, setFetchedLesson] = useState<DiscipleshipLesson | null>(null);
  const [fetchingDirect, setFetchingDirect] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const titleOpacity = scrollY.interpolate({
    inputRange: [50, 110],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (groupId && userProfile?.churchId && (!group || group.id !== groupId)) {
      loadGroupDetails(userProfile.churchId, groupId);
      const unsub = subscribeToGroupDetails(userProfile.churchId, groupId);
      return () => unsub();
    }
  }, [groupId, userProfile?.churchId, group?.id]);

  const lessonFromStore =
    lessons.find((l) => l.id === lessonId) ||
    lessons.find((l) => String(l.weekNumber) === String(lessonId)) ||
    (group?.currentWeekNumber ? lessons.find((l) => l.weekNumber === group.currentWeekNumber) : null) ||
    lessons[0];

  const lesson = lessonFromStore || fetchedLesson;

  useEffect(() => {
    // If not found in store list, attempt direct document lookup by lessonId
    if (!lessonFromStore && lessonId && !fetchingDirect) {
      setFetchingDirect(true);
      const fetchDirectDoc = async () => {
        try {
          // Check discipleshipLessons doc
          const lessonRef = doc(db, 'discipleshipLessons', lessonId);
          const lessonSnap = await getDoc(lessonRef);
          if (lessonSnap.exists()) {
            setFetchedLesson({ ...lessonSnap.data(), id: lessonSnap.id } as DiscipleshipLesson);
            return;
          }

          // Check discipleshipWeeks doc
          const weekRef = doc(db, 'discipleshipWeeks', lessonId);
          const weekSnap = await getDoc(weekRef);
          if (weekSnap.exists()) {
            const data = weekSnap.data();
            setFetchedLesson({
              id: weekSnap.id,
              churchId: data.churchId || userProfile?.churchId || '',
              planId: data.planId || '',
              weekNumber: data.weekNumber || 1,
              title: data.chapterTitle || data.title || `Week ${data.weekNumber || 1}`,
              scriptureReference: data.scriptureReference || '',
              lessonContent: data.storyText || data.lessonContent || '',
              discussionQuestions: data.discussionQuestions || '',
              applicationQuestions: data.applicationQuestions || '',
              memoryVerse: data.memoryVerse || '',
              status: data.status || 'published',
            } as DiscipleshipLesson);
          }
        } catch (e) {
          console.warn('[DiscipleshipLessonDetailScreen] Direct fetch warning:', e);
        } finally {
          setFetchingDirect(false);
        }
      };
      fetchDirectDoc();
    }
  }, [lessonFromStore, lessonId]);

  const currentMemberId = userProfile?.memberId;

  const currentProgress = progressList.find(
    (p) => p.memberId === currentMemberId && (p.lessonId === lessonId || (lesson && p.lessonId === lesson.id))
  );

  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [reflectionNote, setReflectionNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentProgress) {
      setIsCompleted(!!currentProgress.isCompleted);
      setReflectionNote(currentProgress.reflectionNote || '');
    }
  }, [currentProgress]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6596" />
        <Text style={styles.loadingText}>Loading lesson…</Text>
      </View>
    );
  }

  if (!group || !userProfile || !lesson) {
    return (
      <View style={styles.centerContainer}>
        <ShieldAlert size={36} color="#EF4444" />
        <Text style={styles.errorTitle}>Lesson Not Found</Text>
        <Text style={styles.errorSubtitle}>We could not load the requested lesson.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!canViewGroupLesson(userProfile, group, lesson)) {
    return (
      <View style={styles.centerContainer}>
        <ShieldAlert size={36} color="#F59E0B" />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorSubtitle}>You do not have permission to view this lesson.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleToggleCompletion = async () => {
    if (!currentMemberId || !userProfile.churchId || !userProfile.uid) return;
    const newCompleted = !isCompleted;
    setIsCompleted(newCompleted);
    setSaving(true);
    try {
      await saveMemberProgress({
        churchId: userProfile.churchId,
        groupId: group.id,
        planId: group.planId || '',
        lessonId: lesson.id,
        memberId: currentMemberId,
        userId: userProfile.uid,
        weekNumber: lesson.weekNumber,
        isCompleted: newCompleted,
        reflectionNote: reflectionNote.trim(),
      });
    } catch (err) {
      console.error(err);
      setIsCompleted(!newCompleted);
      Alert.alert('Error', 'Failed to update lesson completion status.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReflection = async () => {
    if (!currentMemberId || !userProfile.churchId || !userProfile.uid) return;
    setSaving(true);
    try {
      await saveMemberProgress({
        churchId: userProfile.churchId,
        groupId: group.id,
        planId: group.planId || '',
        lessonId: lesson.id,
        memberId: currentMemberId,
        userId: userProfile.uid,
        weekNumber: lesson.weekNumber,
        isCompleted,
        reflectionNote: reflectionNote.trim(),
      });
      Alert.alert('Saved!', 'Your reflection note has been saved.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save reflection note.');
    } finally {
      setSaving(false);
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
          <Text style={styles.headerOverline}>LESSON {lesson.weekNumber}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {lesson.title}
          </Text>
        </Animated.View>
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
            <Text style={styles.heroWeekTag}>LESSON {lesson.weekNumber}</Text>
            <Text style={styles.heroTitle}>{lesson.title}</Text>
            {lesson.scriptureReference ? (
              <View style={styles.scripturePill}>
                <BookOpen size={14} color="#FFFFFF" />
                <Text style={styles.scriptureText}>{lesson.scriptureReference}</Text>
              </View>
            ) : null}
          </View>
        </SoftCard>

        {/* Memory Verse Card */}
        {lesson.memoryVerse ? (
          <SoftCard innerStyle={styles.memoryVerseCard}>
            <View style={styles.cardHeaderRow}>
              <Quote size={18} color="#FF6596" />
              <Text style={styles.cardHeaderTitle}>Memory Verse</Text>
            </View>
            <Text style={styles.memoryVerseText}>{lesson.memoryVerse}</Text>
          </SoftCard>
        ) : null}

        {/* Lesson Content / Story */}
        {lesson.lessonContent ? (
          <SoftCard innerStyle={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <BookOpen size={18} color="#8B5CF6" />
              <Text style={styles.cardHeaderTitle}>Lesson Overview</Text>
            </View>
            <Text style={styles.bodyText}>{lesson.lessonContent}</Text>
          </SoftCard>
        ) : null}

        {/* Discussion Questions */}
        {lesson.discussionQuestions ? (
          <SoftCard innerStyle={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <HelpCircle size={18} color="#10B981" />
              <Text style={styles.cardHeaderTitle}>Discussion Questions</Text>
            </View>
            <Text style={styles.bodyText}>{lesson.discussionQuestions}</Text>
          </SoftCard>
        ) : null}

        {/* Application Questions */}
        {lesson.applicationQuestions ? (
          <SoftCard innerStyle={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <MessageCircle size={18} color="#F59E0B" />
              <Text style={styles.cardHeaderTitle}>Application Questions</Text>
            </View>
            <Text style={styles.bodyText}>{lesson.applicationQuestions}</Text>
          </SoftCard>
        ) : null}

        {/* Leader Note Section */}
        {currentProgress?.leaderNote ? (
          <SoftCard innerStyle={styles.leaderNoteCard}>
            <View style={styles.cardHeaderRow}>
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={[styles.cardHeaderTitle, { color: '#065F46' }]}>Leader Note</Text>
            </View>
            <Text style={styles.leaderNoteText}>{currentProgress.leaderNote}</Text>
          </SoftCard>
        ) : null}

        {/* Member Reflection Note Form */}
        <SoftCard innerStyle={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Save size={18} color="#FF6596" />
            <Text style={styles.cardHeaderTitle}>My Reflection Note</Text>
          </View>
          <TextInput
            style={styles.reflectionInput}
            multiline
            numberOfLines={4}
            placeholder="Write your personal reflections or answers here..."
            placeholderTextColor="#9CA3AF"
            value={reflectionNote}
            onChangeText={setReflectionNote}
          />
          <TouchableOpacity
            style={[styles.saveNoteBtn, saving && { opacity: 0.5 }]}
            onPress={handleSaveReflection}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveNoteBtnText}>Save Reflection</Text>
            )}
          </TouchableOpacity>
        </SoftCard>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  errorSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  backBtn: { backgroundColor: '#FF6596', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 8 },
  backBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

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
  completeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB' },
  completeBadgeDone: { backgroundColor: '#ECFDF3', borderColor: '#10B981' },
  completeBadgeText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  completeBadgeTextDone: { color: '#10B981' },

  content: { paddingHorizontal: 20, paddingBottom: 100, gap: 16 },

  heroCardInner: { borderRadius: 20, overflow: 'hidden', padding: 20, minHeight: 120 },
  heroContent: { gap: 6 },
  heroWeekTag: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.4 },
  scripturePill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 4,
  },
  scriptureText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', flexShrink: 1, lineHeight: 16 },

  memoryVerseCard: { backgroundColor: '#FFF5F8', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#FFE2EC' },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 10 },
  leaderNoteCard: { backgroundColor: '#ECFDF3', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  memoryVerseText: { fontSize: 15, fontWeight: '600', color: '#BE185D', fontStyle: 'italic', lineHeight: 22 },
  bodyText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  leaderNoteText: { fontSize: 14, color: '#047857', lineHeight: 20, fontStyle: 'italic' },

  reflectionInput: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#111827', minHeight: 100, textAlignVertical: 'top' },
  saveNoteBtn: { backgroundColor: '#FF6596', paddingVertical: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', paddingHorizontal: 20 },
  saveNoteBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
