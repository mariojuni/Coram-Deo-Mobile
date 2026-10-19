import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as functions from 'firebase-functions';
import { NotificationService } from './services/NotificationService';

admin.initializeApp();


const databaseName = 'coramdeo';

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
    let body = '';

    // Fetch actor's display name
    let actorName = 'Someone';
    if (data.authorUserId) {
      const authorSnap = await db.collection('users').doc(data.authorUserId).get();
      if (authorSnap.exists) {
        const authorData = authorSnap.data()!;
        actorName = [authorData.firstName, authorData.lastName].filter(Boolean).join(' ') || 'Someone';
      }
    }

    if (data.parentCommentId) {
      // It's a reply to a comment
      const parentRef = db.collection('comments').doc(data.parentCommentId);
      const parentSnap = await parentRef.get();
      if (!parentSnap.exists) return null;
      ownerId = parentSnap.data()?.authorUserId;
      body = `replied to your comment.`;
    } else {
      // Top-level comment
      if (data.targetType === 'prayer_request') {
        const prayerRef = db.collection('churches').doc(data.churchId || 'default').collection('prayer_requests').doc(data.targetId);
        const prayerSnap = await prayerRef.get();
        if (!prayerSnap.exists) return null;
        ownerId = prayerSnap.data()?.userId;
        body = `commented on your prayer request.`;
      } else if (data.targetType === 'bible_note') {
        const noteRef = db.collection('bibleNotes').doc(data.targetId);
        const noteSnap = await noteRef.get();
        if (!noteSnap.exists) return null;
        ownerId = noteSnap.data()?.userId;
        body = `commented on your note.`;
      } else if (data.targetType === 'church_highlight') {
        const highlightRef = db.collection('bibleVerseHighlights').doc(data.targetId);
        const highlightSnap = await highlightRef.get();
        if (!highlightSnap.exists) return null;
        ownerId = highlightSnap.data()?.userId;
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
      title: actorName,  // Use actor's name as title to match in-app display
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

    const eventId = afterData.eventId;
    if (eventId) {
      const eventDoc = await admin.firestore().collection('events').doc(eventId).get();
      const eventData = eventDoc.data();
      if (eventData && eventData.status?.toLowerCase() !== 'published') {
        console.log(`Event ${eventId} is not published (status: ${eventData.status}). Holding notification.`);
        return null;
      }
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

export const onEventWritten = onDocumentWritten(
  {
    document: 'events/{eventId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const change = event.data;
    if (!change) return null;

    const afterData = change.after?.data();
    const beforeData = change.before?.data();

    if (!afterData) return null;

    // Check if event transitioned to "published"
    const wasPublished = beforeData?.status?.toLowerCase() === 'published';
    const isPublished = afterData.status?.toLowerCase() === 'published';

    if (!wasPublished && isPublished) {
      console.log(`Event ${event.params.eventId} was published. Sending held notifications and updating assignments.`);
      
      const db = admin.firestore();
      const assignmentsSnapshot = await db.collection('ministryAssignments')
        .where('eventId', '==', event.params.eventId)
        .get();

      if (assignmentsSnapshot.empty) {
        console.log('No assignments found for this event.');
        return null;
      }

      const batch = db.batch();

      for (const doc of assignmentsSnapshot.docs) {
        const assignmentData = doc.data();
        
        // Update eventStatus on the assignment so the mobile app will show it
        batch.update(doc.ref, { eventStatus: 'published' });

        const memberId = assignmentData.memberId;
        if (memberId) {
          try {
            await NotificationService.createUserNotification({
              userId: memberId,
              churchId: assignmentData.churchId,
              category: 'serve',
              type: 'ministry_assignment',
              title: `${assignmentData.eventName}`,
              body: `You have been assigned to ${assignmentData.ministryName} as ${assignmentData.roleName}.`,
              sourceType: 'ministry_assignment',
              sourceId: doc.id,
            });
          } catch (err) {
            console.error(`Failed to send notification for assignment ${doc.id}:`, err);
          }
        }
      }

      await batch.commit();
      console.log('Successfully updated assignments and sent notifications.');
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
            title: data.requesterName || data.name || 'New Prayer Request',
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

export const onAnnouncementWritten = onDocumentWritten(
  {
    document: 'announcements/{announcementId}',
    database: databaseName,
    region: 'asia-southeast1',
  },
  async (event) => {
    const change = event.data;
    if (!change) return null;

    const announcementId = event.params.announcementId;
    const db = getFirestore(admin.app(), databaseName);

    // 1. If announcement is deleted, clean up in-app notifications
    if (!change.after.exists) {
      console.log(`[Announcement] ${announcementId} deleted. Cleaning up notifications...`);
      await NotificationService.deleteNotificationsBySource(announcementId);
      return null;
    }

    const afterData = change.after.data();
    if (!afterData) return null;

    // 2. Only proceed if announcement is Published and pushNotification is enabled
    if (afterData.status !== 'Published' || !afterData.pushNotification) {
      return null;
    }

    // 3. Prevent duplicate sends unless explicitly reset (notificationSent: false)
    if (afterData.notificationSent === true) {
      return null;
    }

    // 4. Check publish date (if scheduled in future, scheduler will process it later)
    const now = new Date();
    if (afterData.publishDate) {
      const pubDate = new Date(afterData.publishDate);
      if (pubDate > now) {
        console.log(`[Announcement] ${announcementId} is scheduled for future (${afterData.publishDate}). Skipping immediate push.`);
        return null;
      }
    }

    const churchId = afterData.churchId;
    if (!churchId) {
      console.warn(`[Announcement] ${announcementId} has no churchId. Cannot determine recipient audience.`);
      return null;
    }

    const targetAudience: string[] = Array.isArray(afterData.targetAudience) && afterData.targetAudience.length > 0
      ? afterData.targetAudience
      : ['All Members'];

    console.log(`[Announcement] Dispatching notifications for ${announcementId} to audience: ${targetAudience.join(', ')}`);

    try {
      const recipientUserIds = new Set<string>();
      const isAllMembers = targetAudience.includes('All Members');

      const usersSnap = await db.collection('users').where('churchId', '==', churchId).get();

      if (isAllMembers) {
        usersSnap.forEach((userDoc) => {
          const u = userDoc.data();
          if (u.status !== 'deceased' && u.status !== 'transferred' && u.status !== 'archived') {
            recipientUserIds.add(userDoc.id);
          }
        });
      } else {
        const wantsFullMembers = targetAudience.includes('All Full Members');
        const wantsFellowship = targetAudience.includes('Fellowship Members');
        const wantsMinistryLeaders = targetAudience.includes('Ministry Leaders');

        const generalTags = new Set(['All Members', 'All Full Members', 'Fellowship Members', 'Ministry Leaders']);
        const targetedMinistryNames = targetAudience.filter((tag) => !generalTags.has(tag));

        const ministryMemberIds = new Set<string>();
        if (targetedMinistryNames.length > 0) {
          const ministriesSnap = await db.collection('ministries').where('churchId', '==', churchId).get();
          ministriesSnap.forEach((mDoc) => {
            const mData = mDoc.data();
            if (targetedMinistryNames.includes(mData.name)) {
              if (Array.isArray(mData.members)) {
                mData.members.forEach((m: any) => {
                  if (m?.memberId) ministryMemberIds.add(m.memberId);
                });
              }
              if (mData.leaderId) ministryMemberIds.add(mData.leaderId);
              if (Array.isArray(mData.leaders)) {
                mData.leaders.forEach((l: any) => {
                  if (typeof l === 'string') ministryMemberIds.add(l);
                  else if (l?.id) ministryMemberIds.add(l.id);
                  else if (l?.memberId) ministryMemberIds.add(l.memberId);
                });
              }
            }
          });

          for (const mDoc of ministriesSnap.docs) {
            const mData = mDoc.data();
            if (targetedMinistryNames.includes(mData.name)) {
              const activeMembersSnap = await db.collection('ministryMembers')
                .where('ministryId', '==', mDoc.id)
                .where('status', '==', 'active')
                .get();
              activeMembersSnap.forEach((docSnap) => {
                const memberId = docSnap.data().memberId;
                if (memberId) ministryMemberIds.add(memberId);
              });
            }
          }
        }

        usersSnap.forEach((userDoc) => {
          const u = userDoc.data();
          if (u.status === 'deceased' || u.status === 'transferred' || u.status === 'archived') {
            return;
          }

          const uid = userDoc.id;
          let match = false;

          if (wantsFullMembers) {
            const cat = u.membershipCategory || u.membershipStatus;
            if (cat === 'Full Member' || u.membershipStatus === 'Active') {
              match = true;
            }
          }

          if (wantsFellowship) {
            const cat = u.membershipCategory || u.membershipStatus;
            if (cat === 'Fellowship') {
              match = true;
            }
          }

          if (wantsMinistryLeaders) {
            if (
              u.role === 'ministry_leader' ||
              (Array.isArray(u.roles) && u.roles.includes('ministry_leader')) ||
              u.isMinistryLeader === true ||
              (Array.isArray(u.managedMinistryIds) && u.managedMinistryIds.length > 0)
            ) {
              match = true;
            }
          }

          if (ministryMemberIds.has(uid) || (u.memberId && ministryMemberIds.has(u.memberId))) {
            match = true;
          }

          if (match) {
            recipientUserIds.add(uid);
          }
        });
      }

      console.log(`[Announcement] Found ${recipientUserIds.size} recipient users for announcement ${announcementId}`);

      if (recipientUserIds.size > 0) {
        const notifications: Promise<void>[] = [];
        recipientUserIds.forEach((userId) => {
          notifications.push(
            NotificationService.createUserNotification({
              userId,
              churchId,
              category: 'announcement',
              type: 'church_announcement',
              title: afterData.title || 'Church Announcement',
              body: afterData.message || '',
              sourceType: 'announcement',
              sourceId: announcementId,
              navigation: {
                destination: '/announcement-detail',
                params: { id: announcementId },
              },
            })
          );
        });

        const chunkSize = 20;
        for (let i = 0; i < notifications.length; i += chunkSize) {
          const chunk = notifications.slice(i, i + chunkSize);
          await Promise.all(chunk);
        }
      }

      await db.collection('announcements').doc(announcementId).update({
        notificationSent: true,
        notificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[Announcement] Successfully dispatched push notifications to ${recipientUserIds.size} users.`);
    } catch (error) {
      console.error(`[Announcement] Error sending notifications for ${announcementId}:`, error);
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

      // Check for scheduled announcements whose publishDate has now arrived
      try {
        const pendingAnnouncementsSnap = await db.collection("announcements")
          .where("status", "==", "Published")
          .where("pushNotification", "==", true)
          .where("notificationSent", "==", false)
          .get();

        for (const annDoc of pendingAnnouncementsSnap.docs) {
          const annData = annDoc.data();
          if (annData.publishDate) {
            const pubDate = new Date(annData.publishDate);
            if (pubDate <= now) {
              await annDoc.ref.update({
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
      } catch (annError) {
        console.error("Error processing scheduled announcements:", annError);
      }
    } catch (error) {
      console.error('Error notifying upcoming events:', error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Ultimate Guitar Import — Callable Function
// Proxies calls to the UG Mobile API to bypass browser CORS restrictions.
// Used by the CoramDeo Admin "Import from Ultimate Guitar" feature.
//
// Auth key algorithm (reverse-engineered from community research):
//   X-UG-API-KEY = MD5( deviceId + "YYYY-MM-DD:H" + "createLog()" )
//   X-UG-CLIENT-ID = deviceId (random 16-char hex)
//   User-Agent = "UGT_ANDROID/4.11.1 (Pixel; 8.1.0)"
// ─────────────────────────────────────────────────────────────────────────────

import * as nodeCrypto from 'crypto';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const UG_API_BASE = 'https://api.ultimate-guitar.com/api/v1';
const UG_USER_AGENT = 'UGT_ANDROID/4.11.1 (Pixel; 8.1.0)';

function generateUGDeviceId(): string {
  return nodeCrypto.randomBytes(8).toString('hex');
}

function generateUGApiKey(deviceId: string): string {
  const now = new Date();
  const year  = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(now.getUTCDate()).padStart(2, '0');
  const hour  = now.getUTCHours();
  const dateStr = `${year}-${month}-${day}:${hour}`;
  const payload = `${deviceId}${dateStr}createLog()`;
  return nodeCrypto.createHash('md5').update(payload).digest('hex');
}

function buildUGHeaders(deviceId: string): Record<string, string> {
  return {
    'Accept':         'application/json',
    'Accept-Charset': 'utf-8',
    'User-Agent':     UG_USER_AGENT,
    'Connection':     'close',
    'X-UG-CLIENT-ID': deviceId,
    'X-UG-API-KEY':   generateUGApiKey(deviceId),
  };
}

export const fetchUltimateGuitarTab = onCall(
  {
    region: 'asia-southeast1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    const { url } = request.data as { url?: string };

    if (!url || typeof url !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid UG tab URL is required.');
    }

    if (!url.includes('ultimate-guitar.com')) {
      throw new HttpsError('invalid-argument', 'URL must be from ultimate-guitar.com');
    }


    const deviceId = generateUGDeviceId();
    const headers  = buildUGHeaders(deviceId);

    let tabId: number | undefined;

    // Fast path: Extract tab ID directly from the URL (e.g., ...-chords-123456)
    const match = url.match(/-(\d+)(?:[/?#]|$)/);
    if (match && match[1]) {
      tabId = parseInt(match[1], 10);
      console.info(`[UG] Extracted tab ID ${tabId} directly from URL`);
    }

    if (!tabId) {
      // Fallback: Resolve URL → tab_id
      const urlLookupEndpoint = `${UG_API_BASE}/tab/url?url=${encodeURIComponent(url)}`;
      console.info('[UG] Resolving tab URL', url);

      try {
        const urlRes = await fetch(urlLookupEndpoint, { headers });
        if (!urlRes.ok) {
          throw new HttpsError('not-found', `Ultimate Guitar API returned status ${urlRes.status}.`);
        }
        const urlData = await urlRes.json() as any;
        tabId = urlData?.id;
      } catch (err: any) {
        console.error('[UG] URL Lookup Error:', err);
        throw new HttpsError('internal', `Failed to lookup tab URL: ${err.message}`);
      }
    }

    if (!tabId) {
      throw new HttpsError('not-found', 'Could not resolve tab ID from URL.');
    }

    // Step 2: Fetch full tab data by ID
    const tabInfoEndpoint = `${UG_API_BASE}/tab/info?tab_id=${tabId}&tab_access_type=public`;
    console.info('[UG] Fetching tab info', tabId);

    const tabRes = await fetch(tabInfoEndpoint, { headers });
    if (!tabRes.ok) {
      throw new HttpsError('not-found', `Failed to fetch tab details (status ${tabRes.status}).`);
    }

    const tabData = await tabRes.json() as any;
    const capo: number = tabData?.capo ?? 0;

    return {
      ok: true,
      tab: {
        title:       tabData?.song_name     ?? '',
        artist:      tabData?.artist_name   ?? '',
        originalKey: tabData?.tonality_name ?? '',
        defaultKey:  tabData?.tonality_name ?? '',
        capo,
        capoLabel:   capo > 0 ? `Capo ${capo}` : '',
        difficulty:  tabData?.difficulty    ?? '',
        tuning:      tabData?.tuning        ?? 'Standard',
        tabType:     tabData?.type          ?? '',
        content:     tabData?.content       ?? '',
        sourceUrl:   tabData?.url_web ?? tabData?.urlWeb ?? url,
        tabId,
        votes:       tabData?.votes  ?? 0,
        rating:      tabData?.rating ?? 0,
      },
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SMS Password Reset — Callable Function
// ─────────────────────────────────────────────────────────────────────────────

export const resetPasswordWithPhone = onCall(
  {
    region: 'asia-southeast1',
  },
  async (request) => {
    // 1. Verify that the user is authenticated (they must be, via Firebase Phone Auth)
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be authenticated to perform this action.');
    }

    const { newPassword } = request.data;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw new HttpsError('invalid-argument', 'A valid new password (at least 6 characters) is required.');
    }

    const token = request.auth.token;
    // The phone number of the authenticated user
    const phoneNumber = token.phone_number;

    if (!phoneNumber) {
      throw new HttpsError('failed-precondition', 'The authenticated user does not have a verified phone number.');
    }

    const db = getFirestore(admin.app(), databaseName);

    try {
      // 2. Query Firestore 'users' collection for the verified phone number
      const usersSnap = await db.collection('users').where('phoneNumber', '==', phoneNumber).limit(1).get();

      if (usersSnap.empty) {
        throw new HttpsError('not-found', 'No account found linked to this phone number.');
      }

      // 3. Get the UID of the user to reset
      const userDoc = usersSnap.docs[0];
      const uidToReset = userDoc.id;

      // 4. Update the password via Admin SDK
      await admin.auth().updateUser(uidToReset, {
        password: newPassword,
      });

      return {
        ok: true,
        message: 'Password reset successfully.',
      };
    } catch (error) {
      console.error('[resetPasswordWithPhone] Error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'An error occurred while resetting the password.');
    }
  }
);


// Triggered when a user deletes their Firebase Auth account
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const db = getFirestore(admin.app(), databaseName);
  const userId = user.uid;

  try {
    await db.collection('users').doc(userId).delete();
    console.log(`Successfully deleted user document for UID: ${userId}`);
  } catch (error) {
    console.error(`Failed to delete user document for UID: ${userId}`, error);
  }
});
export * from './completeOAuthProfile';
