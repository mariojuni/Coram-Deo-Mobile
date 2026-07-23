import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  ActivityIndicator, Alert, Keyboard, ActionSheetIOS 
} from 'react-native';

import { Stack as ExpoStack, useLocalSearchParams as useExpoSearchParams, useRouter as useExpoRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, X, Send, User, CheckCircle2, MessageCircle, HeartHandshake, ChevronLeft, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/useAuthStore';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { useComments } from '../hooks/useComments';
import { CommentItem } from '../components/CommentItem';
import type { Comment, CommentTargetType } from '../../domain/comment.types';
import { canCreateComment, canDeleteComment, canModerateComments, canModeratePrayerRequests } from '@/permissions/mobilePermissions';
import { formatPrayerTimeAgo } from '@/features/prayer/domain/prayer.selectors';
import { prayerRepository } from '@/features/prayer/data/prayer.repository';
import { useUIStore } from '@/store/useUIStore';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

import { db } from '@/firebase';
import { doc, getDoc, onSnapshot, DocumentSnapshot, DocumentData } from 'firebase/firestore';

export function CommentThreadScreen() {
  const { targetType, targetId } = useExpoSearchParams<{ targetType: CommentTargetType, targetId: string }>();
  const router = useExpoRouter();
  const insets = useSafeAreaInsets();
  
  const { currentUser, userProfile } = useAuthStore();
  const churchId = userProfile?.churchId;
  const openPrayerModal = useUIStore((state) => state.openPrayerModal);
  
  const [parentData, setParentData] = useState<any>(null);
  const [loadingParent, setLoadingParent] = useState(true);

  const { 
    comments, 
    loading, 
    loadingMore, 
    hasMore, 
    fetchComments, 
    addComment, 
    deleteComment, 
    hideComment 
  } = useComments(churchId || '', targetType as CommentTargetType, targetId);

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // We should allow typing for any signed-in user or active member
  // and handle the validation on submit to prevent the field from being completely disabled/unfocusable
  const canCreate = canCreateComment(userProfile);
  const canModerate = canModerateComments(userProfile);

  useFocusEffect(
    React.useCallback(() => {
      if (churchId && targetType && targetId) {
        fetchComments(true);
      } else {
        setLoadingParent(false);
      }
    }, [churchId, targetType, targetId])
  );

  // Real-time listener for parent document (prayer request / sermon)
  useEffect(() => {
    if (!churchId || !targetType || !targetId) {
      setLoadingParent(false);
      return;
    }

    setLoadingParent(true);
    const parentCollection = targetType === 'prayer_request' ? 'prayer_requests' : 'sermons';
    const docRef = doc(db, 'churches', churchId, parentCollection, targetId);

    const unsubscribe = onSnapshot(docRef, (snapshot: DocumentSnapshot<DocumentData>) => {
      if (snapshot.exists()) {
        setParentData({ id: snapshot.id, ...snapshot.data() });
      }
      setLoadingParent(false);
    }, (err: Error) => {
      console.error('Error listening to parent doc:', err);
      setLoadingParent(false);
    });

    return () => unsubscribe();
  }, [churchId, targetType, targetId]);

  const handlePray = async () => {
    if (!churchId || !parentData || !currentUser?.uid || targetType !== 'prayer_request') return;
    try {
      await prayerRepository.togglePrayerLike(churchId, targetId, currentUser.uid);
      const isLiked = parentData.likedBy?.includes(currentUser.uid);
      setParentData((prev: any) => prev ? {
        ...prev,
        likes: Math.max(0, (prev.likes || 0) + (isLiked ? -1 : 1)),
        likedBy: isLiked 
          ? prev.likedBy?.filter((id: string) => id !== currentUser.uid) 
          : [...(prev.likedBy || []), currentUser.uid]
      } : prev);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswered = async () => {
    if (!churchId || !parentData || targetType !== 'prayer_request') return;
    try {
      const currentAns = parentData.answered || parentData.status === 'answered';
      await prayerRepository.togglePrayerAnswered(churchId, targetId, currentAns);
      setParentData((prev: any) => prev ? { ...prev, answered: !currentAns, status: !currentAns ? 'answered' : 'pending' } : prev);
    } catch (e) {
      console.error(e);
    }
  };

  const handleHeaderMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            if (parentData) openPrayerModal(parentData);
          } else if (buttonIndex === 2) {
            handleDeletePrayer();
          }
        }
      );
    } else {
      Alert.alert(
        'Manage Prayer Request',
        'Choose an action',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => { if (parentData) openPrayerModal(parentData); } },
          { text: 'Delete', onPress: handleDeletePrayer, style: 'destructive' }
        ]
      );
    }
  };

  const handleDeletePrayer = () => {
    Alert.alert(
      'Delete Prayer Request',
      'Are you sure you want to delete this prayer request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!churchId) return;
            try {
              await prayerRepository.deletePrayerRequest(churchId, targetId);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete prayer request.');
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const handleSend = async () => {
    if (!inputText.trim() || !currentUser || !userProfile || !churchId || !canCreate) return;
    
    setIsSubmitting(true);
    try {
      await addComment(
        currentUser.uid,
        userProfile.memberId || '',
        ([userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ')) || (currentUser.displayName as string) || 'Anonymous',
        inputText.trim(),
        replyingTo ? replyingTo.id : null,
        (userProfile.photoUrl as string) || (currentUser.photoURL as string)
      );
      setInputText('');
      setReplyingTo(null);
      Keyboard.dismiss();
      // Refetch comments so reply counts update instantly
      fetchComments(true);
    } catch (err) {
      Alert.alert('Error', 'Could not post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (comment: Comment) => {
    // If it's already a reply, reply to its parent thread instead of nesting infinitely
    setReplyingTo(comment.parentCommentId ? { ...comment, id: comment.parentCommentId } : comment);
    inputRef.current?.focus();
  };

  const handleDelete = (comment: Comment) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          await deleteComment(comment.id, comment.parentCommentId);
          fetchComments(true);
        }
      }
    ]);
  };

  const handleHide = (comment: Comment) => {
    Alert.alert('Hide Comment', 'This will hide the comment from all users except moderators.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Hide', style: 'destructive', onPress: () => hideComment(comment.id) }
    ]);
  };

  const renderHeader = () => {
    if (loadingParent) {
      return (
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <ShimmerSkeleton width={48} height={48} borderRadius={24} />
            <View style={{ marginLeft: 12 }}>
              <ShimmerSkeleton width={120} height={16} style={{ marginBottom: 8 }} />
              <ShimmerSkeleton width={80} height={12} />
            </View>
          </View>
          <ShimmerSkeleton width="100%" height={20} style={{ marginBottom: 8 }} />
          <ShimmerSkeleton width="80%" height={20} style={{ marginBottom: 16 }} />
          <ShimmerSkeleton width="100%" height={150} borderRadius={16} />
        </View>
      );
    }
    if (!parentData) return null;

    if (targetType === 'prayer_request') {
      return (
        <View style={styles.flatParentContainer}>
          <Text style={styles.flatPrayerText}>
            {parentData.title ? <Text style={{ fontWeight: '700', color: '#111827' }}>{parentData.title} — </Text> : null}
            {parentData.request || parentData.requestText || parentData.content}
          </Text>

          <View style={styles.flatPrayerBottomRow}>
            {/* Answered Tag */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {(parentData.answered || parentData.status === 'answered') && (
                <View style={[styles.flatAnsweredBadge, { marginRight: 8 }]}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981', marginRight: 4 }}>Answered</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {(parentData.userId === currentUser?.uid || canModeratePrayerRequests(userProfile)) ? (
                <TouchableOpacity style={[styles.prayIconButton, { marginRight: 16 }]} onPress={handleAnswered}>
                  <CheckCircle2 size={18} color={(parentData.answered || parentData.status === 'answered') ? '#10B981' : '#9CA3AF'} />
                </TouchableOpacity>
              ) : (
                (parentData.answered || parentData.status === 'answered') && (
                  <View style={[styles.flatAnsweredBadge, { marginRight: 16 }]}>
                    <CheckCircle2 size={18} color="#10B981" />
                  </View>
                )
              )}
              
              <View style={[styles.prayIconButton, { marginRight: 16 }]}>
                <MessageCircle size={18} color="#FF6596" />
                <Text style={[styles.prayIconCount, { color: '#FF6596' }]}>
                  {parentData.commentCount || comments.length || 0}
                </Text>
              </View>

              {(() => {
                const isLiked = parentData.likedBy?.includes(currentUser?.uid || '');
                return (
                  <TouchableOpacity style={styles.prayIconButton} onPress={handlePray}>
                    <HeartHandshake size={18} color={isLiked ? "#FF6596" : "#9CA3AF"} />
                    <Text style={[styles.prayIconCount, isLiked && { color: "#FF6596" }]}>{parentData.likes || 0}</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>
        </View>
      );
    } else if (targetType === 'sermon') {
      return (
        <View style={styles.parentHeaderContainer}>
          <View style={styles.sermonHeaderRow}>
            {parentData.thumbnailUrl && (
              <Image source={{ uri: parentData.thumbnailUrl }} style={styles.sermonThumb} />
            )}
            <View style={styles.sermonHeaderInfo}>
              <Text style={styles.sermonTitle} numberOfLines={2}>{parentData.title}</Text>
              <Text style={styles.sermonSubtitle}>{parentData.preacherName}</Text>
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.screen} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ExpoStack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.headerCircle} onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
        </TouchableOpacity>
        
        {targetType === 'prayer_request' && loadingParent ? (
          <View style={styles.headerUserInfo}>
            <ShimmerSkeleton width={32} height={32} borderRadius={16} />
            <View style={{ flex: 1 }}>
              <ShimmerSkeleton width={100} height={14} style={{ marginBottom: 4 }} />
              <ShimmerSkeleton width={60} height={12} />
            </View>
          </View>
        ) : targetType === 'prayer_request' && parentData ? (
          <View style={styles.headerUserInfo}>
            {parentData.userPhotoUrl ? (
              <Image source={{ uri: parentData.userPhotoUrl }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, { alignItems: 'center', justifyContent: 'center' }]}><User size={16} color="#9CA3AF" /></View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.headerName} numberOfLines={1}>{parentData.name || parentData.requesterName || parentData.authorName || 'Anonymous'}</Text>
              </View>
              <Text style={styles.headerTime}>{formatPrayerTimeAgo(parentData.createdAt)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.headerTitle}>Comments</Text>
        )}
        
        {targetType === 'prayer_request' && parentData && (parentData.userId === currentUser?.uid || canModeratePrayerRequests(userProfile)) ? (
          <TouchableOpacity style={styles.headerCircle} onPress={handleHeaderMenu} hitSlop={8}>
            <MoreVertical size={24} color="#1a1a1a" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader()}
        ListHeaderComponentStyle={styles.listHeader}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (hasMore && !loadingMore) fetchComments(false);
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? (
          <View style={{ padding: 20, flexDirection: 'row' }}>
            <ShimmerSkeleton width={36} height={36} borderRadius={18} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                <ShimmerSkeleton width={100} height={14} style={{ marginRight: 8 }} />
                <ShimmerSkeleton width={40} height={14} />
              </View>
              <ShimmerSkeleton width="90%" height={14} style={{ marginBottom: 4 }} />
              <ShimmerSkeleton width="60%" height={14} />
            </View>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <CommentItem 
            comment={item} 
            churchId={churchId!}
            onReply={handleReply}
            onDelete={handleDelete}
            onHide={handleHide}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptySub}>Be the first to share your thoughts.</Text>
            </View>
          ) : loading ? (
            <View style={{ padding: 20 }}>
              {[1, 2, 3].map((key) => (
                <View key={key} style={{ flexDirection: 'row', marginBottom: 20 }}>
                  <ShimmerSkeleton width={36} height={36} borderRadius={18} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <ShimmerSkeleton width={100} height={14} style={{ marginRight: 8 }} />
                      <ShimmerSkeleton width={40} height={14} />
                    </View>
                    <ShimmerSkeleton width="90%" height={14} style={{ marginBottom: 4 }} />
                    <ShimmerSkeleton width="60%" height={14} />
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      {/* Input Area */}
      <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {replyingTo && (
          <View style={styles.replyingToBar}>
            <Text style={styles.replyingToText}>Replying to <Text style={{ fontWeight: '700' }}>{replyingTo.authorDisplayName}</Text></Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 4 }}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Write a comment..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={[styles.sendBtn, (!inputText.trim() || isSubmitting || !canCreate) && styles.sendBtnDisabled]} 
            onPress={() => {
              if (!canCreate) {
                Alert.alert('Members Only', 'You must be a member of this church to comment.');
                return;
              }
              handleSend();
            }}
            disabled={!inputText.trim() || isSubmitting}
          >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Send size={18} color="#FFF" />
              )}
            </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    marginLeft: 12,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  headerTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
    textAlign: 'left',
  },
  listHeader: {
    marginBottom: 16,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  flatParentContainer: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  flatPrayerText: {
    fontSize: 18,
    color: '#111827',
    lineHeight: 28,
  },
  flatPrayerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  flatAnsweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prayIconCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  sermonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sermonThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  sermonHeaderInfo: {
    flex: 1,
  },
  sermonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sermonSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  parentHeaderContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
  },
  headerLoader: {
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 13,
    color: '#4B5563',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  myAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 4, // Align with input visually
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: '#111827',
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6596',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
