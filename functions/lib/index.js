"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCommentsOnPrayerDelete = exports.syncUserNameOnUpdate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.syncUserNameOnUpdate = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const nameChanged = beforeData.firstName !== afterData.firstName ||
        beforeData.middleName !== afterData.middleName ||
        beforeData.lastName !== afterData.lastName;
    const photoChanged = beforeData.photoUrl !== afterData.photoUrl;
    // Check if either name or photo actually changed
    if (!nameChanged && !photoChanged) {
        return null;
    }
    const newName = [afterData.firstName, afterData.middleName, afterData.lastName].filter(Boolean).join(' ');
    const newPhotoUrl = afterData.photoUrl || null;
    const userId = context.params.userId;
    console.log(`User ${userId} changed profile. Syncing...`);
    const batch = db.batch();
    // We need to query prayer_requests and comments across ALL churches.
    // In Firestore, if we need to query subcollections across all parents, we use a Collection Group query.
    // However, if we don't have collection group indexes, we might have to query them per church.
    // Let's assume we can query them via collectionGroup if we have it, 
    // or just assume we know the user's churchId.
    // Since users belong to a specific churchId (afterData.churchId), we can query that church directly.
    const churchId = afterData.churchId;
    if (!churchId) {
        console.log('User has no churchId. Skipping sync.');
        return null;
    }
    try {
        // 1. Update Prayer Requests
        // Depending on the exact fields: requesterName, name, createdBy vs userId.
        const prayersSnapshot = await db
            .collection('churches')
            .doc(churchId)
            .collection('prayer_requests')
            .where('userId', '==', userId)
            .get();
        prayersSnapshot.forEach((doc) => {
            // Also respect isAnonymous if they have it
            const data = doc.data();
            if (!data.isAnonymous) {
                const updates = {};
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
        // 2. Update Comments
        const commentsSnapshot = await db
            .collection('comments') // From your repository, it looks like comments is a root collection
            .where('userId', '==', userId)
            .get();
        commentsSnapshot.forEach((doc) => {
            const updates = {};
            if (nameChanged)
                updates.userName = newName;
            if (photoChanged)
                updates.userPhotoUrl = newPhotoUrl;
            batch.update(doc.ref, updates);
        });
        // 3. Update Giving Records
        const givingSnapshot = await db
            .collection('givingRecords')
            .where('userId', '==', userId)
            .get();
        givingSnapshot.forEach((doc) => {
            if (nameChanged)
                batch.update(doc.ref, { donorName: newName });
        });
        // 4. Update Ministry Assignments
        const assignmentSnapshot = await db
            .collection('ministryAssignments')
            .where('memberId', '==', userId)
            .get();
        assignmentSnapshot.forEach((doc) => {
            if (nameChanged)
                batch.update(doc.ref, { memberName: newName });
        });
        // 5. Update Ministries (Array of MinistryMembers)
        // Firestore doesn't support querying by a partial object in an array, so we fetch all ministries for this church
        const ministriesSnapshot = await db
            .collection('ministries')
            .where('churchId', '==', churchId)
            .get();
        ministriesSnapshot.forEach((doc) => {
            const data = doc.data();
            let updated = false;
            const members = data.members || [];
            const updatedMembers = members.map((member) => {
                if (member.memberId === userId) {
                    updated = true;
                    return Object.assign(Object.assign(Object.assign({}, member), (nameChanged && { memberName: newName })), (photoChanged && { avatar: newPhotoUrl }));
                }
                return member;
            });
            if (updated) {
                batch.update(doc.ref, { members: updatedMembers });
            }
        });
        await batch.commit();
        console.log(`Successfully synced name for user ${userId}`);
    }
    catch (error) {
        console.error('Error syncing user names:', error);
    }
    return null;
});
exports.deleteCommentsOnPrayerDelete = functions.firestore
    .document('churches/{churchId}/prayer_requests/{prayerId}')
    .onDelete(async (snap, context) => {
    const prayerId = context.params.prayerId;
    console.log(`Prayer request ${prayerId} deleted. Deleting associated comments...`);
    try {
        const commentsSnapshot = await db
            .collection('comments')
            .where('targetType', '==', 'prayer_request')
            .where('targetId', '==', prayerId)
            .get();
        if (commentsSnapshot.empty) {
            console.log('No comments found for this prayer request.');
            return null;
        }
        const batch = db.batch();
        commentsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Successfully deleted ${commentsSnapshot.size} comments.`);
    }
    catch (error) {
        console.error('Error deleting associated comments:', error);
    }
    return null;
});
//# sourceMappingURL=index.js.map