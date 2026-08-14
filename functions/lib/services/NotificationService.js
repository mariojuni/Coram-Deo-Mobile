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
exports.NotificationService = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
class NotificationService {
    /**
     * Creates an in-app notification in Firestore and attempts to send a push notification.
     */
    static async createUserNotification(params) {
        const databaseName = process.env.GCLOUD_PROJECT === 'coramdeo-prod' ? 'coramdeo' : '(default)';
        const db = (0, firestore_1.getFirestore)(admin.app(), databaseName);
        const notificationId = db.collection('_').doc().id; // Generate random ID
        const notificationData = Object.assign(Object.assign({ id: notificationId }, params), { isRead: false, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        const notificationRef = db.doc(`userNotifications/${params.userId}/items/${notificationId}`);
        const stateRef = db.doc(`userNotificationState/${params.userId}`);
        try {
            // 1. Write the notification and increment unread count transactionally
            await db.runTransaction(async (transaction) => {
                var _a;
                // Reads must come before writes
                const stateDoc = await transaction.get(stateRef);
                transaction.set(notificationRef, notificationData);
                if (stateDoc.exists) {
                    const count = ((_a = stateDoc.data()) === null || _a === void 0 ? void 0 : _a.unreadCount) || 0;
                    transaction.update(stateRef, {
                        unreadCount: count + 1,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                else {
                    transaction.set(stateRef, {
                        userId: params.userId,
                        unreadCount: 1,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
            // 2. Try to send FCM push
            await this.sendPushToUser(params.userId, params);
        }
        catch (error) {
            console.error(`Error creating notification for user ${params.userId}:`, error);
        }
    }
    /**
     * Sends FCM push notification strictly to matching environment tokens.
     */
    static async sendPushToUser(userId, params) {
        const databaseName = process.env.GCLOUD_PROJECT === 'coramdeo-prod' ? 'coramdeo' : '(default)';
        const db = (0, firestore_1.getFirestore)(admin.app(), databaseName);
        // We determine our current backend environment using process.env or project id.
        // Assuming standard Firebase setups, `GCLOUD_PROJECT` has the project ID.
        // e.g., 'coramdeo-prod' vs 'coramdeo-staging'
        const projectId = process.env.GCLOUD_PROJECT || '';
        const isProduction = projectId.includes('prod');
        const targetEnvironment = isProduction ? 'production' : 'staging';
        try {
            const tokensSnap = await db.collection(`userPushTokens/${userId}/devices`)
                .where('notificationsEnabled', '==', true)
                .where('environment', '==', targetEnvironment)
                .get();
            if (tokensSnap.empty) {
                return; // No tokens for this user in this environment
            }
            const tokens = [];
            tokensSnap.forEach(doc => {
                const data = doc.data();
                if (data.token)
                    tokens.push(data.token);
            });
            if (tokens.length === 0)
                return;
            const payload = {
                notification: {
                    title: params.title,
                    body: params.body,
                },
                data: {
                    category: params.category,
                    sourceType: params.sourceType || '',
                    sourceId: params.sourceId || '',
                    // pass navigation object stringified if needed
                }
            };
            const response = await admin.messaging().sendEachForMulticast({
                tokens,
                notification: payload.notification,
                data: payload.data,
            });
            // 3. Clean up invalid tokens
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    var _a;
                    if (!resp.success) {
                        const errCode = (_a = resp.error) === null || _a === void 0 ? void 0 : _a.code;
                        if (errCode === 'messaging/invalid-registration-token' ||
                            errCode === 'messaging/registration-token-not-registered') {
                            failedTokens.push(tokens[idx]);
                        }
                    }
                });
                if (failedTokens.length > 0) {
                    const batch = db.batch();
                    tokensSnap.docs.forEach(doc => {
                        if (failedTokens.includes(doc.data().token)) {
                            batch.delete(doc.ref);
                        }
                    });
                    await batch.commit();
                }
            }
        }
        catch (error) {
            console.error(`Error sending push to user ${userId}:`, error);
        }
    }
    /**
     * Deletes all notifications associated with a given sourceId across all users.
     * Useful when the underlying entity (prayer request, comment) is deleted.
     */
    static async deleteNotificationsBySource(sourceId) {
        if (!sourceId)
            return;
        const databaseName = process.env.GCLOUD_PROJECT === 'coramdeo-prod' ? 'coramdeo' : '(default)';
        const db = (0, firestore_1.getFirestore)(admin.app(), databaseName);
        try {
            const snap = await db.collectionGroup('items').where('sourceId', '==', sourceId).get();
            if (snap.empty)
                return;
            const batch = db.batch();
            const userUnreadDecrements = new Map();
            snap.docs.forEach(doc => {
                var _a;
                batch.delete(doc.ref);
                const data = doc.data();
                if (data.isRead === false) {
                    const userId = (_a = doc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
                    if (userId) {
                        userUnreadDecrements.set(userId, (userUnreadDecrements.get(userId) || 0) + 1);
                    }
                }
            });
            for (const [userId, count] of userUnreadDecrements.entries()) {
                const stateRef = db.doc(`userNotificationState/${userId}`);
                batch.update(stateRef, {
                    unreadCount: admin.firestore.FieldValue.increment(-count)
                });
            }
            await batch.commit();
            console.log(`Deleted ${snap.size} notifications for sourceId ${sourceId}`);
        }
        catch (error) {
            console.error(`Error deleting notifications for source ${sourceId}:`, error);
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map