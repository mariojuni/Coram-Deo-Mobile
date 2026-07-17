import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  ActivityIndicator, Alert, Keyboard 
} from 'react-native';

import { Stack as ExpoStack, useLocalSearchParams as useExpoSearchParams, useRouter as useExpoRouter } from 'expo-router';
import { ArrowLeft, X, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/useAuthStore';
import { useComments } from '../hooks/useComments';
import { CommentItem } from '../components/CommentItem';
import type { Comment, CommentTargetType } from '../../domain/comment.types';
import { canCreateComment, canDeleteComment, canModerateComments } from '@/permissions/mobilePermissions';

import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function CommentThreadScreen() {
  const { targetType, targetId } = useExpoSearchParams<{ targetType: CommentTargetType, targetId: string }>();
  const router = useExpoRouter();
  const insets = useSafeAreaInsets();
  
  const { currentUser, userProfile } = useAuthStore();
  const churchId = userProfile?.churchId;
  
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

  const canCreate = canCreateComment(userProfile);
  const canModerate = canModerateComments(userProfile);

  useEffect(() => {
    if (churchId && targetType && targetId) {
      loadParentData();
      fetchComments(true);
    } else {
      setLoadingParent(false);
    }
  }, [churchId, targetType, targetId]);

  const loadParentData = async () => {
    try {
      if (!churchId || !targetId) return;
      let ref;
      if (targetType === 'prayer_request') {
        ref = doc(db, 'churches', churchId, 'prayerRequests', targetId);
      } else if (targetType === 'sermon') {
        ref = doc(db, 'churches', churchId, 'sermons', targetId);
      }
      
      if (ref) {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setParentData(snap.data());
        }
      }
    } catch (e) {
      console.error('Error loading parent data', e);
    } finally {
      setLoadingParent(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !currentUser || !userProfile || !churchId || !canCreate) return;
    
    setIsSubmitting(true);
    try {
      await addComment(
        currentUser.uid,
        userProfile.memberId || '',
        (userProfile.fullName as string) || (currentUser.displayName as string) || 'Anonymous',
        inputText.trim(),
        replyingTo ? replyingTo.id : null,
        (userProfile.photoUrl as string) || (currentUser.photoURL as string)
      );
      setInputText('');
      setReplyingTo(null);
      Keyboard.dismiss();
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
      { text: 'Delete', style: 'destructive', onPress: () => deleteComment(comment.id, comment.parentCommentId) }
    ]);
  };

  const handleHide = (comment: Comment) => {
    Alert.alert('Hide Comment', 'This will hide the comment from all users except moderators.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Hide', style: 'destructive', onPress: () => hideComment(comment.id) }
    ]);
  };

  const renderParentHeader = () => {
    if (loadingParent) return <ActivityIndicator style={styles.headerLoader} />;
    if (!parentData) return null;

    if (targetType === 'prayer_request') {
      return (
        <View style={styles.parentHeaderContainer}>
          <Text style={styles.parentTitle}>{parentData.title}</Text>
          <Text style={styles.parentContent} numberOfLines={3}>{parentData.content || parentData.request}</Text>
          <View style={styles.parentStats}>
            <Text style={styles.parentStatText}>{parentData.prayedCount || 0} Prayed</Text>
            <Text style={styles.parentStatText}>•</Text>
            <Text style={styles.parentStatText}>{parentData.commentCount || 0} Comments</Text>
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
              <Text style={styles.parentTitle} numberOfLines={2}>{parentData.title}</Text>
              <Text style={styles.parentSubtitle}>{parentData.preacherName}</Text>
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderParentHeader}
        ListHeaderComponentStyle={styles.listHeader}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (hasMore && !loadingMore) fetchComments(false);
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} /> : null}
        renderItem={({ item }) => (
          <CommentItem 
            comment={item} 
            churchId={churchId!}
            onReply={handleReply}
            onDelete={handleDelete}
            onHide={handleHide}
            canDelete={canDeleteComment(userProfile, item.authorUserId)}
            canModerate={canModerate}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptySub}>Be the first to share your thoughts.</Text>
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: 40 }} />
          )
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
          {userProfile?.photoUrl ? (
            <Image source={{ uri: userProfile.photoUrl }} style={styles.myAvatar} />
          ) : (
             <View style={[styles.myAvatar, { backgroundColor: '#E5E7EB' }]} />
          )}
          
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={canCreate ? "Write a comment..." : "You must be a member to comment."}
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={canCreate}
            maxLength={1000}
          />
          
          {canCreate && (
            <TouchableOpacity 
              style={[styles.sendBtn, (!inputText.trim() || isSubmitting) && styles.sendBtnDisabled]} 
              onPress={handleSend}
              disabled={!inputText.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Send size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          )}
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
  listHeader: {
    marginBottom: 16,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  parentHeaderContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  parentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  parentContent: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  parentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parentStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
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
  parentSubtitle: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: '#111827',
    maxHeight: 120,
    minHeight: 44,
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
