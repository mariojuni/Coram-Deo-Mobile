import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Megaphone,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import AppModal from '@/components/ui/AppModal';
import { BounceCard } from '@/components/ui/BounceCard';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import type {
  DiscipleshipGroup,
  DiscipleshipLesson,
} from '../../domain/discipleshipGroup.types';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useMemberStore } from '../../../../store/useMemberStore';
import { useDiscipleshipGroupStore } from '../../../../store/useDiscipleshipGroupStore';

interface LeaderToolsModalProps {
  visible: boolean;
  onClose: () => void;
  group: DiscipleshipGroup;
  lessons: DiscipleshipLesson[];
  onOpenAttendance?: () => void;
}

export function LeaderToolsModal({
  visible,
  onClose,
  group,
  lessons,
  onOpenAttendance,
}: LeaderToolsModalProps) {
  const userProfile = useAuthStore((state) => state.userProfile);
  const members = useMemberStore((state) => state.members);

  const { groupProgress, createPost, saveLeaderNote, advanceGroupWeek } = useDiscipleshipGroupStore();

  const [activeTab, setActiveTab] = useState<'progress' | 'announcement' | 'notes'>('progress');
  const [announcementText, setAnnouncementText] = useState('');
  const [posting, setPosting] = useState(false);

  // Slide and Fade animations for sheet vs backdrop
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(600);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  // Leader Note state
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    lessons.length > 0 ? lessons[0].id : null
  );
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const handleAdvanceWeek = async () => {
    if (!userProfile?.churchId || !group.planId) return;
    const currentWk = group.currentWeekNumber || 1;
    if (currentWk >= lessons.length) {
      Alert.alert('Final Week', 'Your group is already at the final week of this discipleship plan.');
      return;
    }
    const nextWk = currentWk + 1;
    const nextLesson = lessons.find((l) => l.weekNumber === nextWk) || lessons[0];

    setAdvancing(true);
    try {
      await advanceGroupWeek(
        userProfile.churchId,
        group.id,
        nextWk,
        nextLesson?.id || null,
        userProfile.uid
      );
      Alert.alert('Week Advanced', `Group is now on Week ${nextWk}: ${nextLesson?.title || ''}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to advance week.');
    } finally {
      setAdvancing(false);
    }
  };

  const groupMembers = group.memberIds
    .map((mId) => members.find((m) => m.id === mId))
    .filter(Boolean);

  const handlePostAnnouncement = async () => {
    if (!announcementText.trim() || !userProfile?.churchId || !userProfile.uid) return;
    setPosting(true);
    try {
      await createPost({
        churchId: userProfile.churchId,
        groupId: group.id,
        authorUserId: userProfile.uid,
        authorMemberId: userProfile.memberId || undefined,
        authorName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Leader',
        authorPhotoUrl: userProfile.photoUrl,
        type: 'announcement',
        content: announcementText.trim(),
      });
      setAnnouncementText('');
      Alert.alert('Success', 'Announcement posted to group.');
      setActiveTab('progress');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to post announcement.');
    } finally {
      setPosting(false);
    }
  };

  const handleSaveLeaderNote = async () => {
    if (!selectedMemberId || !selectedLessonId || !userProfile?.churchId || !userProfile.uid) {
      Alert.alert('Validation Error', 'Please select a member and lesson.');
      return;
    }
    const lesson = lessons.find((l) => l.id === selectedLessonId);
    if (!lesson) return;

    const targetMember = members.find((m) => m.id === selectedMemberId);

    setSavingNote(true);
    try {
      await saveLeaderNote({
        churchId: userProfile.churchId,
        groupId: group.id,
        lessonId: lesson.id,
        memberId: selectedMemberId,
        userId: targetMember?.userId || '',
        planId: group.planId || '',
        weekNumber: lesson.weekNumber,
        leaderNote: noteText.trim(),
      });
      Alert.alert('Success', 'Leader note saved successfully.');
      setNoteText('');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save leader note.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        >
          <Animated.View style={[styles.darkOverlay, { opacity: fadeAnim }]} />
        </TouchableOpacity>
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overline}>LEADER TOOLS</Text>
              <Text style={styles.title} numberOfLines={1}>{group.name}</Text>
            </View>
            <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={onClose} hitSlop={8} activeOpacity={0.8}>
              <X size={20} color="#111827" strokeWidth={2} />
            </BounceCard>
          </View>

          {/* Quick Actions Row */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabChip, activeTab === 'progress' && styles.tabChipActive]}
              onPress={() => setActiveTab('progress')}
            >
              <Users size={14} color={activeTab === 'progress' ? '#FFFFFF' : '#4B5563'} />
              <Text style={[styles.tabChipText, activeTab === 'progress' && styles.tabChipTextActive]}>
                Progress
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabChip, activeTab === 'announcement' && styles.tabChipActive]}
              onPress={() => setActiveTab('announcement')}
            >
              <Megaphone size={14} color={activeTab === 'announcement' ? '#FFFFFF' : '#4B5563'} />
              <Text style={[styles.tabChipText, activeTab === 'announcement' && styles.tabChipTextActive]}>
                Announcement
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabChip, activeTab === 'notes' && styles.tabChipActive]}
              onPress={() => setActiveTab('notes')}
            >
              <FileText size={14} color={activeTab === 'notes' ? '#FFFFFF' : '#4B5563'} />
              <Text style={[styles.tabChipText, activeTab === 'notes' && styles.tabChipTextActive]}>
                Add Note
              </Text>
            </TouchableOpacity>

            {onOpenAttendance && (
              <TouchableOpacity
                style={[styles.tabChip, { backgroundColor: '#ECFDF3', borderColor: '#10B981' }]}
                onPress={() => {
                  onClose();
                  onOpenAttendance();
                }}
              >
                <UserCheck size={14} color="#10B981" />
                <Text style={[styles.tabChipText, { color: '#10B981' }]}>Attendance</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content Area */}
          <ScrollView contentContainerStyle={styles.content}>
            {activeTab === 'progress' && (
              <View style={styles.section}>
                {group.planId ? (
                  <View style={{ backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF6596' }}>PLAN PROGRESS</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>Week {group.currentWeekNumber || 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: '#FF6596', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={handleAdvanceWeek}
                      disabled={advancing}
                    >
                      <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Advance Week</Text>
                      <ChevronRight size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <Text style={styles.sectionHeading}>Member Lesson Completion</Text>
                {groupMembers.length === 0 ? (
                  <Text style={styles.emptyText}>No members in this group.</Text>
                ) : (
                  groupMembers.map((m: any) => {
                    const completedCount = lessons.filter((l) =>
                      groupProgress.some(
                        (p) => p.memberId === m.id && p.lessonId === l.id && p.isCompleted
                      )
                    ).length;
                    const percent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

                    return (
                      <View key={m.id} style={styles.memberProgressCard}>
                        <View style={styles.memberProgressHeader}>
                          <Text style={styles.memberName}>
                            {m.firstName} {m.lastName}
                          </Text>
                          <Text style={styles.percentText}>{percent}% ({completedCount}/{lessons.length})</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {activeTab === 'announcement' && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Post Group Announcement</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  placeholder="Type an announcement for your group..."
                  placeholderTextColor="#9CA3AF"
                  value={announcementText}
                  onChangeText={setAnnouncementText}
                />
                <TouchableOpacity
                  style={[styles.submitBtn, (!announcementText.trim() || posting) && styles.disabledBtn]}
                  onPress={handlePostAnnouncement}
                  disabled={!announcementText.trim() || posting}
                >
                  {posting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Post Announcement</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'notes' && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Add Leader Note</Text>

                <Text style={styles.inputLabel}>Select Member:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
                  {groupMembers.map((m: any) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.pickerChip, selectedMemberId === m.id && styles.pickerChipActive]}
                      onPress={() => setSelectedMemberId(m.id)}
                    >
                      <Text style={[styles.pickerChipText, selectedMemberId === m.id && styles.pickerChipTextActive]}>
                        {m.firstName} {m.lastName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Select Lesson:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
                  {lessons.map((l) => (
                    <TouchableOpacity
                      key={l.id}
                      style={[styles.pickerChip, selectedLessonId === l.id && styles.pickerChipActive]}
                      onPress={() => setSelectedLessonId(l.id)}
                    >
                      <Text style={[styles.pickerChipText, selectedLessonId === l.id && styles.pickerChipTextActive]}>
                        Wk {l.weekNumber}: {l.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Leader Note / Feedback:</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  placeholder="Write encouragement, guidance, or feedback for this member..."
                  placeholderTextColor="#9CA3AF"
                  value={noteText}
                  onChangeText={setNoteText}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, (savingNote || !selectedMemberId || !selectedLessonId) && styles.disabledBtn]}
                  onPress={handleSaveLeaderNote}
                  disabled={savingNote || !selectedMemberId || !selectedLessonId}
                >
                  {savingNote ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Save Leader Note</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCirclePlaceholder: { width: 36, height: 36 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  mainContentWrap: {
    paddingTop: 65,
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  overline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabChipActive: {
    backgroundColor: '#FF6596',
    borderColor: '#FF6596',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  section: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  memberProgressCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  memberProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  percentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6596',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6596',
    borderRadius: 3,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  submitBtn: {
    backgroundColor: '#FF6596',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  pickerRow: {
    gap: 8,
    paddingVertical: 4,
  },
  pickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  pickerChipActive: {
    backgroundColor: '#B66DFF',
    borderColor: '#B66DFF',
  },
  pickerChipText: {
    fontSize: 12,
    color: '#4B5563',
  },
  pickerChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
