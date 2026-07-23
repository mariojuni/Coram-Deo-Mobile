import { db } from '@/firebase';
import { 
  collection, doc, getDoc, getDocs, query, where, orderBy, 
  limit, startAfter, runTransaction, Timestamp, DocumentData, QueryDocumentSnapshot, onSnapshot 
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

  subscribeReplies(
    churchId: string, 
    targetType: CommentTargetType, 
    targetId: string, 
    parentCommentId: string,
    onUpdate: (replies: Comment[]) => void
  ) {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('churchId', '==', churchId),
      where('targetType', '==', targetType),
      where('targetId', '==', targetId),
      where('parentCommentId', '==', parentCommentId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const replies = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
        updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
        deletedAt: doc.data().deletedAt ? (doc.data().deletedAt as Timestamp).toDate() : undefined,
      })) as Comment[];
      onUpdate(replies);
    });
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
      let pDoc = null;
      let parentCommentRef = null;

      // 1. ALL READS FIRST
      if (data.parentCommentId) {
        parentCommentRef = doc(db, COMMENTS_COLLECTION, data.parentCommentId);
        pDoc = await transaction.get(parentCommentRef);
      }

      // Read parent target document (Sermon/PrayerRequest)
      const targetDoc = await transaction.get(parentDocRef);

      // 2. ALL WRITES AFTER READS
      // If it's a reply, increment reply count on parent comment
      if (pDoc && pDoc.exists() && parentCommentRef) {
        transaction.update(parentCommentRef, { replyCount: (pDoc.data().replyCount || 0) + 1 });
      }

      // Increment commentCount on parent target document
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

    // If deleting a parent comment, query all nested replies to delete them as well
    let replySnapshots: QueryDocumentSnapshot<DocumentData>[] = [];
    if (!parentCommentId) {
      const repliesQuery = query(
        collection(db, COMMENTS_COLLECTION),
        where('churchId', '==', churchId),
        where('targetType', '==', targetType),
        where('targetId', '==', targetId),
        where('parentCommentId', '==', commentId)
      );
      const res = await getDocs(repliesQuery);
      replySnapshots = res.docs;
    }

    await runTransaction(db, async (transaction) => {
      const cDoc = await transaction.get(commentRef);
      if (!cDoc.exists()) return;

      const targetDoc = await transaction.get(parentDocRef);

      // Total items being deleted: 1 (the comment itself) + count of nested replies
      const totalDeletedCount = 1 + replySnapshots.length;

      // Decrement replyCount on parent comment if this is a reply
      if (parentCommentId) {
        const parentCommentRef = doc(db, COMMENTS_COLLECTION, parentCommentId);
        const pDoc = await transaction.get(parentCommentRef);
        if (pDoc.exists() && parentCommentRef) {
          const currentReplies = pDoc.data().replyCount || 0;
          transaction.update(parentCommentRef, { replyCount: Math.max(0, currentReplies - 1) });
        }
      }

      // Update parent target commentCount subtracting parent comment + all its replies
      if (targetDoc.exists()) {
        const currentCount = targetDoc.data().commentCount || 0;
        transaction.update(parentDocRef, { commentCount: Math.max(0, currentCount - totalDeletedCount) });
      }

      // Delete all nested replies
      replySnapshots.forEach((rDoc) => {
        transaction.delete(rDoc.ref);
      });

      // Hard delete main comment from Firestore
      transaction.delete(commentRef);
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
