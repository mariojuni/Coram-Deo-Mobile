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
exports.optimizeSermonVideo = exports.syncUserNameOnUpdate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// v2 Firestore trigger using Eventarc — required for named databases (Firestore Enterprise).
// The old v1 trigger (functions.firestore) does NOT support named databases.
exports.syncUserNameOnUpdate = (0, firestore_1.onDocumentUpdated)({
    document: 'users/{userId}',
    database: 'coramdeo',
    region: 'asia-southeast1',
}, async (event) => {
    const change = event.data;
    if (!change)
        return null;
    const db = (0, firestore_2.getFirestore)(admin.app(), 'coramdeo');
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
        const commentsSnapshot = await db.collection('comments').where('authorUserId', '==', userId).get();
        commentsSnapshot.forEach((doc) => {
            const updates = {};
            if (nameChanged)
                updates.authorDisplayName = newName;
            if (photoChanged)
                updates.authorPhotoUrl = newPhotoUrl;
            batch.update(doc.ref, updates);
        });
        const oldCommentsSnapshot = await db.collection('comments').where('userId', '==', userId).get();
        oldCommentsSnapshot.forEach((doc) => {
            const updates = {};
            if (nameChanged)
                updates.userName = newName;
            if (photoChanged)
                updates.userPhotoUrl = newPhotoUrl;
            batch.update(doc.ref, updates);
        });
        const givingSnapshot = await db.collection('givingRecords').where('userId', '==', userId).get();
        givingSnapshot.forEach((doc) => {
            if (nameChanged)
                batch.update(doc.ref, { donorName: newName });
        });
        const assignmentSnapshot = await db.collection('ministryAssignments').where('memberId', '==', userId).get();
        assignmentSnapshot.forEach((doc) => {
            if (nameChanged)
                batch.update(doc.ref, { memberName: newName });
        });
        const ministriesSnapshot = await db.collection('ministries').where('churchId', '==', churchId).get();
        ministriesSnapshot.forEach((doc) => {
            const data = doc.data();
            let updated = false;
            const members = data.members || [];
            const updatedMembers = members.map((member) => {
                if (member.memberId === userId) {
                    updated = true;
                    return Object.assign(Object.assign(Object.assign({}, member), (nameChanged && { membersName: newName })), (photoChanged && { avatar: newPhotoUrl }));
                }
                return member;
            });
            if (updated) {
                batch.update(doc.ref, { members: updatedMembers });
            }
        });
        const applicationsSnapshot = await db.collection('ministryApplications').where('userId', '==', userId).get();
        applicationsSnapshot.forEach((doc) => {
            const updates = {};
            if (nameChanged)
                updates.applicantName = newName;
            if (photoChanged)
                updates.applicantPhotoUrl = newPhotoUrl;
            batch.update(doc.ref, updates);
        });
        await batch.commit();
        console.log(`Successfully synced name/photo for user ${userId}`);
    }
    catch (error) {
        console.error('Error syncing user names:', error);
    }
    return null;
});
const storage_1 = require("firebase-functions/v2/storage");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
exports.optimizeSermonVideo = (0, storage_1.onObjectFinalized)({
    bucket: 'coramdeo-prod.firebasestorage.app',
    region: 'us-east1',
    memory: '4GiB', // Increased to handle larger video buffering
    timeoutSeconds: 540, // Max allowed timeout for Eventarc background triggers
}, async (event) => {
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
        await new Promise((resolve, reject) => {
            ffmpeg(tempFilePath)
                // -c copy: Don't re-encode pixels (instant)
                // -movflags +faststart: Move MOOV atom to the front for web streaming
                .outputOptions(['-c copy', '-movflags +faststart'])
                .output(tempOutputPath)
                .on('end', () => resolve())
                .on('error', (err) => {
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
                metadata: Object.assign(Object.assign({}, metadata), { optimized: 'true' }),
            },
        });
        console.log('Video optimization complete!');
    }
    catch (error) {
        console.error('Optimization failed:', error);
    }
    finally {
        // Clean up tmp files
        if (fs.existsSync(tempFilePath))
            fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempOutputPath))
            fs.unlinkSync(tempOutputPath);
    }
});
//# sourceMappingURL=index.js.map