import { db } from '@/firebase';
import { 
  collection, doc, getDoc, getDocs, query, where, orderBy, 
  limit, startAfter, runTransaction, Timestamp, DocumentData, QueryDocumentSnapshot 
} from 'firebase/firestore';
import type { Comment, CommentTargetType, CommentStatus } from '../domain/comment.types';

const COMMENTS_COLLECTION = 'comments';

export const commentRepository = {
  
  async getComments(
    churchId: string, 
    targetType: CommentTargetType, 
    targetId: string, 
    pageSize: number = 20, 
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ) {
    let q = query(
      collection(db, COMMENTS_COLLECTION),
      where('churchId', '==', churchId),
      where('targetType', '==', targetType),
      where('targetId', '==', targetId),
      where('parentCommentId', '==', null),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const comments = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
      deletedAt: doc.data().deletedAt ? (doc.data().deletedAt as Timestamp).toDate() : undefined,
    })) as Comment[];

    return { comments, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
  },

  async getReplies(churchId: string, targetType: CommentTargetType, targetId: string, parentCommentId: string) {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('churchId', '==', churchId),
      where('targetType', '==', targetType),
      where('targetId', '==', targetId),
      where('parentCommentId', '==', parentCommentId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
      deletedAt: doc.data().deletedAt ? (doc.data().deletedAt as Timestamp).toDate() : undefined,
    })) as Comment[];
  },

  async addComment(
    data: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'replyCount' | 'status'>
  ): Promise<Comment> {
    const commentRef = doc(collection(db, COMMENTS_COLLECTION));
    const now = Timestamp.now();

    const parentCollection = data.targetType === 'prayer_request' ? 'prayer_requests' : 'sermons';
    const parentDocRef = doc(db, 'churches', data.churchId, parentCollection, data.targetId);

    const newCommentData = {
      ...data,
      status: 'active' as CommentStatus,
      likeCount: 0,
      replyCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await runTransaction(db, async (transaction) => {
      // If it's a reply, increment reply count on parent comment
      if (data.parentCommentId) {
        const parentCommentRef = doc(db, COMMENTS_COLLECTION, data.parentCommentId);
        const pDoc = await transaction.get(parentCommentRef);
        if (pDoc.exists()) {
          transaction.update(parentCommentRef, { replyCount: (pDoc.data().replyCount || 0) + 1 });
        }
      }

      // Increment commentCount on parent target document (Sermon/PrayerRequest)
      const targetDoc = await transaction.get(parentDocRef);
      if (targetDoc.exists()) {
        transaction.update(parentDocRef, { commentCount: (targetDoc.data().commentCount || 0) + 1 });
      }

      // Add the comment
      transaction.set(commentRef, newCommentData);
    });

    return {
      ...newCommentData,
      id: commentRef.id,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    } as Comment;
  },

  async deleteComment(churchId: string, targetType: CommentTargetType, targetId: string, commentId: string, parentCommentId: string | null) {
    const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
    const parentCollection = targetType === 'prayer_request' ? 'prayer_requests' : 'sermons';
    const parentDocRef = doc(db, 'churches', churchId, parentCollection, targetId);

    await runTransaction(db, async (transaction) => {
      const cDoc = await transaction.get(commentRef);
      if (!cDoc.exists() || cDoc.data().status === 'deleted') return;

      const targetDoc = await transaction.get(parentDocRef);

      // Soft delete
      transaction.update(commentRef, { 
        status: 'deleted', 
        content: 'This comment has been deleted.',
        deletedAt: Timestamp.now() 
      });

      // Update parent target commentCount (we'll decrement it since it's deleted)
      if (targetDoc.exists()) {
        const currentCount = targetDoc.data().commentCount || 0;
        transaction.update(parentDocRef, { commentCount: Math.max(0, currentCount - 1) });
      }

      // Note: we don't decrement replyCount on parentComment because the reply still exists as "deleted"
    });
  },

  async hideComment(commentId: string) {
    const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
    await runTransaction(db, async (transaction) => {
      const cDoc = await transaction.get(commentRef);
      if (cDoc.exists()) {
        transaction.update(commentRef, { status: 'hidden' });
      }
    });
  }
};
