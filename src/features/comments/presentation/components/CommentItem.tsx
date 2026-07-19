import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import type { Comment } from '../../domain/comment.types';
import { commentRepository } from '../../data/comment.repository';

import { useAuthStore } from '@/store/useAuthStore';
import { canModerateComments } from '@/permissions/mobilePermissions';

interface CommentItemProps {
  comment: Comment;
  churchId: string;
  onReply: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
  onHide?: (comment: Comment) => void;
  level?: number;
}

export function CommentItem({ 
  comment, 
  churchId,
  onReply, 
  onDelete, 
  onHide,
  level = 0
}: CommentItemProps) {
  const { userProfile } = useAuthStore();
  const canDelete = userProfile?.uid === comment.authorUserId;
  const canModerate = canModerateComments(userProfile);

  const [replies, setReplies] = useState<Comment[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  
  // Format "time ago"
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm';
    return Math.floor(seconds) + 's';
  };

  const handleToggleReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    
    if (replies.length === 0) {
      setLoadingReplies(true);
      try {
        const fetched = await commentRepository.getReplies(
          churchId,
          comment.targetType,
          comment.targetId,
          comment.id
        );
        setReplies(fetched);
      } catch (err) {
        console.error('Error fetching replies:', err);
      } finally {
        setLoadingReplies(false);
      }
    }
    setShowReplies(true);
  };

  const isDeleted = comment.status === 'deleted';
  const isHidden = comment.status === 'hidden';

  if (isDeleted) return null;
  if (isHidden && !canModerate) return null;

  return (
    <View style={[styles.container, { marginLeft: level * 30 }]}>
      <View style={styles.headerRow}>
        {comment.authorPhotoUrl ? (
          <Image 
            source={{ uri: comment.authorPhotoUrl }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
            <User size={16} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.contentContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName}>{comment.authorDisplayName}</Text>
            {isHidden && <Text style={styles.hiddenBadge}>Hidden</Text>}
            <Text style={styles.timeText}>· {getTimeAgo(comment.createdAt)}</Text>
          </View>
          <Text style={[styles.content, isDeleted && styles.deletedContent]}>
            {comment.content}
          </Text>
          
          <View style={styles.actionRow}>
            {!isDeleted && level === 0 && (
              <TouchableOpacity onPress={() => onReply(comment)}>
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            )}
            
            {(!isDeleted && canDelete) && (
              <TouchableOpacity onPress={() => onDelete(comment)}>
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            )}

            {(!isDeleted && !isHidden && canModerate && onHide) && (
              <TouchableOpacity onPress={() => onHide(comment)}>
                <Text style={styles.actionText}>Hide</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* View Replies Button */}
      {comment.replyCount > 0 && level === 0 && (
        <TouchableOpacity style={styles.viewRepliesBtn} onPress={handleToggleReplies}>
          <Text style={styles.viewRepliesText}>
            {showReplies ? 'Hide replies' : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Render Replies */}
      {showReplies && (
        <View style={styles.repliesContainer}>
          {loadingReplies ? (
            <Text style={styles.loadingText}>Loading replies...</Text>
          ) : (
            replies.map(reply => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                churchId={churchId}
                onReply={onReply}
                onDelete={onDelete}
                onHide={onHide}
                level={level + 1} 
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  authorName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#111827',
  },
  hiddenBadge: {
    fontSize: 10,
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  content: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  deletedContent: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  viewRepliesBtn: {
    marginLeft: 40,
    marginTop: 4,
  },
  viewRepliesText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: 12,
  },
  loadingText: {
    marginLeft: 40,
    fontSize: 13,
    color: '#9CA3AF',
  }
});
