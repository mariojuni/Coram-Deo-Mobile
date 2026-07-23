import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { commentRepository } from '../../data/comment.repository';
import type { Comment } from '../../domain/comment.types';

import { canModerateComments } from '@/permissions/mobilePermissions';
import { useAuthStore } from '@/store/useAuthStore';

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
  const [showReplyButton, setShowReplyButton] = useState(true);
  const [lastReplyY, setLastReplyY] = useState(0);
  const [viewReplyY, setViewReplyY] = useState(0);

  // Real-time Firestore subscription for nested replies
  useEffect(() => {
    if (!showReplies) return;

    setLoadingReplies(true);
    const unsubscribe = commentRepository.subscribeReplies(
      churchId,
      comment.targetType,
      comment.targetId,
      comment.id,
      (fetchedReplies) => {
        setReplies(fetchedReplies);
        setLoadingReplies(false);
      }
    );

    return () => unsubscribe();
  }, [showReplies, churchId, comment.targetType, comment.targetId, comment.id]);

  // Reset state when screen re-enters
  useEffect(() => {
    setShowReplyButton(true);
    setShowReplies(false);
    setLastReplyY(0);
    setViewReplyY(0);
  }, []);

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

  const handleToggleReplies = () => {
    if (showReplies) {
      setShowReplies(false);
      setShowReplyButton(true);
    } else {
      setShowReplyButton(false);
      setShowReplies(true);
    }
  };

  const isDeleted = comment.status === 'deleted';
  const isHidden = comment.status === 'hidden';

  if (isDeleted) return null;
  if (isHidden && !canModerate) return null;

  // Only top-level comments show the threading UI
  const hasReplies = comment.replyCount > 0 && level === 0;

  return (
    <View style={[styles.container, { marginLeft: level > 0 ? 28 : 0 }]}>

      {/* ── Comment body row ── */}
      <View style={styles.commentBody}>

        {/* Left column: avatar + thread line (grows with content via flex:1) */}
        <View style={styles.leftColumn}>
          {comment.authorPhotoUrl ? (
            <Image source={{ uri: comment.authorPhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <User size={16} color="#9CA3AF" />
            </View>
          )}
          {/*
            threadLineVertical uses flex:1 so it fills leftColumn height
            after the avatar. leftColumn stretches to match contentColumn
            height (flex row default alignItems:'stretch'), so the line
            automatically covers the full comment content — no measurement needed.
          */}
          {hasReplies && (showReplies || showReplyButton) && <View style={styles.threadLineVertical} />}
        </View>

        {/* Right column: comment content */}
        <View style={styles.contentColumn}>
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
            {!isDeleted && canDelete && (
              <TouchableOpacity onPress={() => onDelete(comment)}>
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            )}
            {!isDeleted && !isHidden && canModerate && onHide && (
              <TouchableOpacity onPress={() => onHide(comment)}>
                <Text style={styles.actionText}>Hide</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ── View replies button & curve ── */}
      {hasReplies && showReplyButton && (
        <View style={styles.viewRepliesContainer}>
          <View style={styles.viewReplyCurve} />
          <TouchableOpacity style={styles.viewRepliesBtn} onPress={handleToggleReplies}>
            <Text style={styles.viewRepliesText}>
              {`View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Replies ──
          repliesSection starts flush below commentBody (no margin-top).
          continuationLine (top:0 bottom:0) spans its full height,
          connecting seamlessly to threadLineVertical above. */}
      {showReplies && (
        <View style={styles.repliesSection}>
          {/* Continuous parent thread line dynamically calculated down to the last nested comment's curve */}
          {lastReplyY > 0 && <View style={[styles.parentThreadLine, { height: lastReplyY }]} />}
          {loadingReplies ? (
            <Text style={styles.loadingText}>Loading replies...</Text>
          ) : (
            replies.map((reply, index) => {
              const isLast = index === replies.length - 1;
              return (
                <View
                  key={reply.id}
                  style={styles.replyRowItem}
                  onLayout={(e) => {
                    if (isLast) {
                      const y = e.nativeEvent.layout.y;
                      setLastReplyY(y + 8);
                    }
                  }}
                >
                  {/* Branch curve from the parent line to this reply's avatar */}
                  <View style={styles.replyBranchCurve} />
                  <CommentItem
                    comment={reply}
                    churchId={churchId}
                    onReply={onReply}
                    onDelete={onDelete}
                    onHide={onHide}
                    level={level + 1}
                  />
                </View>
              );
            })
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

  // ── Comment body ──────────────────────────────────────────────────────────
  commentBody: {
    flexDirection: 'row',
    // Default alignItems:'stretch' makes leftColumn stretch to contentColumn height,
    // so threadLineVertical (flex:1) fills the correct space automatically.
  },
  leftColumn: {
    width: 32,
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * Thread line: flex:1 fills the remaining height of leftColumn after
   * the avatar (32 px). leftColumn height == commentBody height ==
   * contentColumn height, so the line always ends exactly at the bottom
   * of the comment content — regardless of how many lines the text has.
   */
  threadLineVertical: {
    width: 2,
    flex: 1,
    backgroundColor: '#D1D5DB',
    marginTop: 4,
  },
  contentColumn: {
    flex: 1,
    paddingTop: 2,
  },

  // ── Name / content / actions ──────────────────────────────────────────────
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

  // ── View replies button ───────────────────────────────────────────────────
  viewRepliesContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  /**
   * Curve: borderLeft aligns with threadLineVertical center (leftColumn
   * is 32 px wide, 2 px line centered → left edge at X=15).
   * top: -4 overlaps slightly with the thread line tail so the join
   * is visually seamless.
   */
  viewReplyCurve: {
    position: 'absolute',
    left: 15,
    top: 0,
    width: 20,
    height: 12,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#D1D5DB',
    borderBottomLeftRadius: 12,
    zIndex: 2,
  },
  viewRepliesBtn: {
    marginLeft: 44,
    marginTop: 4,
    paddingVertical: 2,
  },
  viewRepliesText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },

  // ── Replies section ───────────────────────────────────────────────────────
  repliesSection: {
    position: 'relative',
    marginTop: 8,
  },
  /**
   * continuationLine: spans the full height of repliesSection via
   * top:0 / bottom:0. Positioned at the same X as threadLineVertical,
   * creating one unbroken thread from avatar through all replies.
   */
  replyLineSegment: {
    position: 'absolute',
    left: 15,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#D1D5DB',
    zIndex: 1,
  },
  parentThreadLine: {
    position: 'absolute',
    left: 15,
    top: -8,
    width: 2,
    backgroundColor: '#D1D5DB',
    zIndex: 1,
  },
  replyRowItem: {
    position: 'relative',
    marginBottom: 4,
  },
  /**
   * Branch curve: connects the continuationLine (at X=15) to the
   * nested reply's avatar (which starts at X=28 due to level>0 marginLeft).
   */
  replyBranchCurve: {
    position: 'absolute',
    left: 15,
    top: 0,
    width: 13,
    height: 12,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#D1D5DB',
    borderBottomLeftRadius: 12,
    zIndex: 2,
  },
  loadingText: {
    marginLeft: 40,
    fontSize: 13,
    color: '#9CA3AF',
  },
});
