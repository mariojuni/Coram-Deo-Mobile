import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { NotificationService } from './services/NotificationService';

admin.initializeApp();


const databaseName = process.env.GCLOUD_PROJECT === 'coramdeo-prod' ? 'coramdeo' : '(default)';

// v2 Firestore trigger using Eventarc — required for named databases (Firestore Enterprise).
// The old v1 trigger (functions.firestore) does NOT support named databases.
export const syncUserNameOnUpdate = onDocumentUpdated(
  {
    document: 'users/{userId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const change = event.data;
    if (!change) return null;

    const db = getFirestore(admin.app(), databaseName);
    const userId = event.params.userId;
    console.log(`[DEBUG] syncUserNameOnUpdate triggered for user ${userId} in coramdeo database`);

    const beforeData = change.before.data();
    const afterData = change.after.data();

    const nameChanged = beforeData.firstName !== afterData.firstName ||
      beforeData.middleName !== afterData.middleName ||
      beforeData.lastName !== afterData.lastName;
    const photoChanged = beforeData.photoUrl !== afterData.photoUrl;

    if (!nameChanged && !photoChanged) {
      return null;
    }

    const newName = [afterData.firstName, afterData.middleName, afterData.lastName].filter(Boolean).join(' ');
    const newPhotoUrl = afterData.photoUrl || null;

    console.log(`User ${userId} changed profile. Syncing...`);

    const batch = db.batch();
    const churchId = afterData.churchId;
    if (!churchId) {
      console.log('User has no churchId. Skipping sync.');
      return null;
    }

    try {
      const prayersSnapshot = await db
        .collection('churches')
        .doc(churchId)
        .collection('prayer_requests')
        .where('userId', '==', userId)
        .get();

      prayersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.isAnonymous) {
          const updates: any = {};
          if (nameChanged) {
            updates.name = newName;
            updates.requesterName = newName;
          }
          if (photoChanged) {
            updates.userPhotoUrl = newPhotoUrl;
          }
          batch.update(doc.ref, updates);
        }
      });

      const commentsSnapshot = await db.collection('comments').where('authorUserId', '==', userId).get();
      commentsSnapshot.forEach((doc) => {
        const updates: any = {};
        if (nameChanged) updates.authorDisplayName = newName;
        if (photoChanged) updates.authorPhotoUrl = newPhotoUrl;
        batch.update(doc.ref, updates);
      });

      const oldCommentsSnapshot = await db.collection('comments').where('userId', '==', userId).get();
      oldCommentsSnapshot.forEach((doc) => {
        const updates: any = {};
        if (nameChanged) updates.userName = newName;
        if (photoChanged) updates.userPhotoUrl = newPhotoUrl;
        batch.update(doc.ref, updates);
      });

      const givingSnapshot = await db.collection('givingRecords').where('userId', '==', userId).get();
      givingSnapshot.forEach((doc) => {
        if (nameChanged) batch.update(doc.ref, { donorName: newName });
      });

      const assignmentSnapshot = await db.collection('ministryAssignments').where('memberId', '==', userId).get();
      assignmentSnapshot.forEach((doc) => {
        if (nameChanged) batch.update(doc.ref, { memberName: newName });
      });

      const ministriesSnapshot = await db.collection('ministries').where('churchId', '==', churchId).get();
      ministriesSnapshot.forEach((doc) => {
        const data = doc.data();
        let updated = false;
        const members = data.members || [];
        const updatedMembers = members.map((member: any) => {
          if (member.memberId === userId) {
            updated = true;
            return {
              ...member,
              ...(nameChanged && { membersName: newName }),
              ...(photoChanged && { avatar: newPhotoUrl })
            };
          }
          return member;
        });
        if (updated) {
          batch.update(doc.ref, { members: updatedMembers });
        }
      });

      const applicationsSnapshot = await db.collection('ministryApplications').where('userId', '==', userId).get();
      applicationsSnapshot.forEach((doc) => {
        const updates: any = {};
        if (nameChanged) updates.applicantName = newName;
        if (photoChanged) updates.applicantPhotoUrl = newPhotoUrl;
        batch.update(doc.ref, updates);
      });

      await batch.commit();
      console.log(`Successfully synced name/photo for user ${userId}`);
    } catch (error) {
      console.error('Error syncing user names:', error);
    }

    return null;
  }
);

export const onCommentCreated = onDocumentCreated(
  {
    document: 'comments/{commentId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const data = snap.data();
    const allowedTypes = ['prayer_request', 'bible_note', 'church_highlight'];
    if (!allowedTypes.includes(data.targetType)) return null;

    const db = getFirestore(admin.app(), databaseName);
    let ownerId: string | undefined;
    let title = 'New Comment';
    let body = '';

    if (data.parentCommentId) {
      // It's a reply to a comment
      const parentRef = db.collection('comments').doc(data.parentCommentId);
      const parentSnap = await parentRef.get();
      if (!parentSnap.exists) return null;
      ownerId = parentSnap.data()?.authorUserId;
      title = 'New Reply';
      body = `replied to your comment.`;
    } else {
      // Top-level comment
      if (data.targetType === 'prayer_request') {
        const prayerRef = db.collection('churches').doc(data.churchId || 'default').collection('prayer_requests').doc(data.targetId);
        const prayerSnap = await prayerRef.get();
        if (!prayerSnap.exists) return null;
        ownerId = prayerSnap.data()?.userId;
        title = 'New Prayer Comment';
        body = `commented on your prayer request.`;
      } else if (data.targetType === 'bible_note') {
        const noteRef = db.collection('bibleNotes').doc(data.targetId);
        const noteSnap = await noteRef.get();
        if (!noteSnap.exists) return null;
        ownerId = noteSnap.data()?.userId;
        title = 'New Note Comment';
        body = `commented on your note.`;
      } else if (data.targetType === 'church_highlight') {
        const highlightRef = db.collection('bibleVerseHighlights').doc(data.targetId);
        const highlightSnap = await highlightRef.get();
        if (!highlightSnap.exists) return null;
        ownerId = highlightSnap.data()?.userId;
        title = 'New Highlight Comment';
        body = `commented on your highlight.`;
      }
    }

    // Do not notify if the owner commented/replied on their own item
    if (!ownerId || ownerId === data.authorUserId) return null;

    // Use social category for notes/highlights so it opens the comment thread properly
    const category = data.targetType === 'prayer_request' ? 'prayer' : 'social';

    await NotificationService.createUserNotification({
      userId: ownerId,
      churchId: data.churchId,
      category,
      type: `${data.targetType}_comment`,
      title,
      body,
      sourceType: data.targetType,
      sourceId: data.targetId,
      actorUserId: data.authorUserId,
    });

    return null;
  }
);

export const onMinistryAssignmentWritten = onDocumentWritten(
  {
    document: 'ministryAssignments/{assignmentId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const change = event.data;
    if (!change) {
      console.log('No change data found.');
      return null;
    }

    const afterData = change.after?.data();
    const beforeData = change.before?.data();

    // If it was deleted, clean up notifications
    if (!afterData) {
      console.log('Assignment was deleted. Cleaning up notifications.');
      await NotificationService.deleteNotificationsBySource(event.params.assignmentId);
      return null;
    }

    // If it's an update, check if memberId changed
    if (beforeData && beforeData.memberId === afterData.memberId) {
      console.log(`Assignment updated but memberId did not change (${afterData.memberId}). Skipping.`);
      return null;
    }

    const memberId = afterData.memberId;
    if (!memberId) {
      console.log('No memberId in assignment. Skipping.');
      return null;
    }

    console.log(`Sending notification to user ${memberId} for assignment ${event.params.assignmentId}`);

    try {
      await NotificationService.createUserNotification({
        userId: memberId,
        churchId: afterData.churchId,
        category: 'serve',
        type: 'ministry_assignment',
        title: `${afterData.eventName}`,
        body: `You have been assigned to ${afterData.ministryName} as ${afterData.roleName}.`,
        sourceType: 'ministry_assignment',
        sourceId: event.params.assignmentId,
      });
      console.log('Notification sent successfully.');
    } catch (err) {
      console.error('Failed to send notification:', err);
    }

    return null;
  }
);

export const onPrayerRequestCreated = onDocumentCreated(
  {
    document: 'churches/{churchId}/prayer_requests/{requestId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const data = snap.data();
    // Do not broadcast anonymous requests or if we don't have basic data
    if (!data || data.isAnonymous) return null;

    const churchId = event.params.churchId;
    const authorUserId = data.userId;

    const db = getFirestore(admin.app(), databaseName);

    try {
      // Fetch all users in the same church
      const usersSnap = await db.collection('users').where('churchId', '==', churchId).get();

      const notifications: Promise<void>[] = [];
      usersSnap.forEach((doc) => {
        const userId = doc.id;
        const userData = doc.data();

        // Don't notify the person who created the prayer request
        if (userId === authorUserId) return;

        // If visibility is restricted, only notify pastors and admins
        if (data.visibility === 'leaders_only') {
          const roles = userData.systemRoles || (userData.role ? [userData.role] : []);
          const isLeader = roles.some((r: string) => ['pastor', 'church_admin', 'super_admin'].includes(r));
          if (!isLeader) return;
        }

        notifications.push(
          NotificationService.createUserNotification({
            userId: userId,
            churchId: churchId,
            category: 'prayer',
            type: 'new_prayer_request',
            title: 'New Prayer Request',
            body: `shared a new prayer request.`,
            sourceType: 'prayer_request',
            sourceId: event.params.requestId,
            actorUserId: authorUserId,
          })
        );
      });

      // Execute in chunks to avoid overwhelming Firestore transactions or FCM
      const chunkSize = 20;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        const chunk = notifications.slice(i, i + chunkSize);
        await Promise.all(chunk);
      }

      console.log(`Successfully broadcasted prayer request ${event.params.requestId} to ${notifications.length} members.`);
    } catch (error) {
      console.error('Error broadcasting prayer request:', error);
    }

    return null;
  }
);

export const onPrayerRequestDeleted = onDocumentDeleted(
  {
    document: 'churches/{churchId}/prayer_requests/{requestId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const requestId = event.params.requestId;
    if (requestId) {
      console.log(`Prayer request ${requestId} deleted, cleaning up notifications...`);
      await NotificationService.deleteNotificationsBySource(requestId);
    }
  }
);

export const onCommentDeleted = onDocumentDeleted(
  {
    document: 'comments/{commentId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const commentId = event.params.commentId;
    if (commentId) {
      console.log(`Comment ${commentId} deleted, cleaning up notifications...`);
      await NotificationService.deleteNotificationsBySource(commentId);
    }
  }
);

export const onGivingRecordCreated = onDocumentCreated(
  {
    document: 'givingRecords/{recordId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const data = snap.data();
    if (data.status !== 'pending') return null;

    const churchId = data.churchId;
    const amount = data.amount || 0;
    const donorName = data.donorName || 'A member';
    const db = getFirestore(admin.app(), databaseName);

    try {
      const usersSnap = await db.collection('users').where('churchId', '==', churchId).get();
      const notifications: Promise<void>[] = [];

      usersSnap.forEach((doc) => {
        const userData = doc.data();
        const roles = userData.systemRoles || (userData.role ? [userData.role] : []);
        const isAdmin = roles.some((r: string) => ['finance_admin', 'church_admin', 'super_admin'].includes(r));

        if (isAdmin) {
          notifications.push(
            NotificationService.createUserNotification({
              userId: doc.id,
              churchId: churchId,
              category: 'giving',
              type: 'giving_pending',
              title: 'Giving Verification Needed',
              body: `${donorName} submitted a giving of ₱${amount.toLocaleString()} that requires your verification.`,
              sourceType: 'giving_pending',
              sourceId: event.params.recordId,
              actorUserId: data.userId,
            })
          );
        }
      });

      const chunkSize = 20;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        const chunk = notifications.slice(i, i + chunkSize);
        await Promise.all(chunk);
      }
    } catch (error) {
      console.error('Error notifying admins about giving:', error);
    }
    return null;
  }
);

export const onGivingRecordUpdated = onDocumentUpdated(
  {
    document: 'givingRecords/{recordId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const change = event.data;
    if (!change) return null;

    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (beforeData.status !== afterData.status && (afterData.status === 'completed' || afterData.status === 'approved')) {
      const amount = afterData.amount || 0;
      try {
        await NotificationService.createUserNotification({
          userId: afterData.userId,
          churchId: afterData.churchId,
          category: 'giving',
          type: 'giving_approval',
          title: 'Giving Approved',
          body: `Your giving of ₱${amount.toLocaleString()} has been successfully verified. Thank you for your generosity!`,
          sourceType: 'giving_approval',
          sourceId: event.params.recordId,
        });
      } catch (error) {
        console.error('Error notifying member about giving approval:', error);
      }
    }
    return null;
  }
);

import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const optimizeSermonVideo = onObjectFinalized(
  {
    region: 'us-east1',
    memory: '4GiB', // Increased to handle larger video buffering
    timeoutSeconds: 540, // Max allowed timeout for Eventarc background triggers
  },
  async (event) => {
    // Require ffmpeg inside the handler to prevent Firebase CLI from crashing during local deployment analysis
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);

    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const metadata = event.data.metadata || {};

    // Trigger only for files in the sermons raw media path
    if (!filePath.includes('/sermons/') || !filePath.includes('/media/raw/')) {
      return;
    }

    // Must be a video
    if (!contentType || !contentType.startsWith('video/')) {
      return;
    }

    // Prevent infinite loops
    if (metadata.optimized === 'true') {
      console.log(`File ${filePath} is already optimized.`);
      return;
    }

    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const tempOutputPath = path.join(os.tmpdir(), `optimized_${fileName}`);

    const bucket = admin.storage().bucket(fileBucket);

    try {
      console.log(`Downloading ${filePath} to ${tempFilePath} for fast-start optimization...`);
      await bucket.file(filePath).download({ destination: tempFilePath });

      console.log('Running FFmpeg faststart optimization...');
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempFilePath)
          // -c copy: Don't re-encode pixels (instant)
          // -movflags +faststart: Move MOOV atom to the front for web streaming
          .outputOptions(['-c copy', '-movflags +faststart'])
          .output(tempOutputPath)
          .on('end', () => resolve())
          .on('error', (err: any) => {
            console.error('FFmpeg error:', err);
            reject(err);
          })
          .run();
      });

      console.log(`Uploading optimized video back to ${filePath}...`);
      await bucket.upload(tempOutputPath, {
        destination: filePath,
        metadata: {
          contentType,
          metadata: {
            ...metadata,
            optimized: 'true',
          },
        },
      });

      console.log('Video optimization complete!');
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      // Clean up tmp files
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    }
  }
);

import { onSchedule } from 'firebase-functions/v2/scheduler';

export const notifyUpcomingEvents = onSchedule(
  {
    schedule: '*/15 * * * 0,3,5', // Every 15 mins on Sunday, Wednesday, Friday
    region: 'asia-southeast1',
    timeZone: 'Asia/Manila',
  },
  async (event) => {
    const db = getFirestore(admin.app(), databaseName);
    const now = new Date();
    // Look ahead 65 minutes to safely catch events in the next hour without missing due to cron delays
    const lookAheadTime = new Date(now.getTime() + 65 * 60000);

    try {
      const eventsSnap = await db.collection('events')
        .where('status', '==', 'Published')
        .get();

      const eventsToNotify: any[] = [];
      eventsSnap.forEach(doc => {
        const data = doc.data();
        if (data.notificationSent) return; // Already notified

        let eventTime = null;
        if (data.startTimestamp) {
          eventTime = data.startTimestamp.toDate();
        } else if (data.date && data.startTime) {
          // Fallback parsing for existing string dates
          const d = new Date(data.date);
          const timeStr = String(data.startTime).trim();
          const timeMatch12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          const timeMatch24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);

          if (timeMatch12) {
            let hours = parseInt(timeMatch12[1], 10);
            const mins = parseInt(timeMatch12[2], 10);
            const isPM = timeMatch12[3].toUpperCase() === 'PM';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
            d.setHours(hours, mins, 0, 0);
            eventTime = d;
          } else if (timeMatch24) {
            const hours = parseInt(timeMatch24[1], 10);
            const mins = parseInt(timeMatch24[2], 10);
            d.setHours(hours, mins, 0, 0);
            eventTime = d;
          }
        }

        if (eventTime && eventTime > now && eventTime <= lookAheadTime) {
          eventsToNotify.push({ id: doc.id, data, eventTime });
        }
      });

      if (eventsToNotify.length === 0) {
        console.log('No upcoming events to notify in this window.');
        return;
      }

      for (const upcoming of eventsToNotify) {
        const churchId = upcoming.data.churchId;
        if (!churchId) continue;

        const usersSnap = await db.collection('users').where('churchId', '==', churchId).get();
        const notifications: Promise<void>[] = [];

        usersSnap.forEach((userDoc) => {
          notifications.push(
            NotificationService.createUserNotification({
              userId: userDoc.id,
              churchId: churchId,
              category: 'event',
              type: 'event_reminder',
              title: 'Upcoming Event Reminder',
              body: `Reminder: ${upcoming.data.title || 'An event'} starts in about an hour at ${upcoming.data.location || 'church'}! We encourage you to attend.`,
              sourceType: 'event',
              sourceId: upcoming.id,
            })
          );
        });

        // Execute in chunks
        const chunkSize = 20;
        for (let i = 0; i < notifications.length; i += chunkSize) {
          const chunk = notifications.slice(i, i + chunkSize);
          await Promise.all(chunk);
        }

        // Mark event as notified
        await db.collection('events').doc(upcoming.id).update({
          notificationSent: true
        });

        console.log(`Sent ${notifications.length} reminders for event ${upcoming.id}`);
      }
    } catch (error) {
      console.error('Error notifying upcoming events:', error);
    }
  }
);
