import { useState, useCallback } from 'react';
import { commentRepository } from '../../data/comment.repository';
import type { Comment, CommentTargetType } from '../../domain/comment.types';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export function useComments(churchId: string, targetType: CommentTargetType, targetId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | undefined>();
  const [hasMore, setHasMore] = useState(true);

  const fetchComments = useCallback(async (refresh = false) => {
    if (!churchId || (!refresh && (!hasMore || loadingMore || loading))) return;

    if (refresh) {
      setLoading(true);
      setComments([]);
      setLastDoc(undefined);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await commentRepository.getComments(
        churchId,
        targetType,
        targetId,
        20,
        refresh ? undefined : lastDoc
      );

      if (refresh) {
        setComments(res.comments);
      } else {
        setComments(prev => [...prev, ...res.comments]);
      }

      setLastDoc(res.lastDoc);
      if (res.comments.length < 20) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      // Prevent infinite loop if query fails (e.g. missing index)
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [churchId, targetType, targetId, lastDoc, hasMore, loading, loadingMore]);

  const addComment = async (
    authorUserId: string,
    authorMemberId: string,
    authorDisplayName: string,
    content: string,
    parentCommentId: string | null = null,
    authorPhotoUrl?: string
  ) => {
    try {
      const newComment = await commentRepository.addComment({
        churchId,
        targetType,
        targetId,
        parentCommentId,
        authorUserId,
        authorMemberId,
        authorDisplayName,
        authorPhotoUrl,
        content
      });

      if (!parentCommentId) {
        setComments(prev => [newComment, ...prev]);
      } else {
        // Find parent and increment replyCount in local state if we were showing it
        setComments(prev => prev.map(c => 
          c.id === parentCommentId ? { ...c, replyCount: c.replyCount + 1 } : c
        ));
      }
      return newComment;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  const deleteComment = async (commentId: string, parentCommentId: string | null) => {
    try {
      await commentRepository.deleteComment(churchId, targetType, targetId, commentId, parentCommentId);
      // Optimistic update
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, status: 'deleted', content: 'This comment has been deleted.' };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  const hideComment = async (commentId: string) => {
    try {
      await commentRepository.hideComment(commentId);
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, status: 'hidden' };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error hiding comment:', err);
      throw err;
    }
  };

  return {
    comments,
    loading,
    loadingMore,
    hasMore,
    fetchComments,
    addComment,
    deleteComment,
    hideComment
  };
}
