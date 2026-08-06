import { getActiveDb } from '@/firebase';
import {
  arrayUnion,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  collection,
  where,
  runTransaction,
} from 'firebase/firestore';
import type { UserAccount } from '@/features/auth/domain/auth.types';
import type { MinistryApplication, MinistryMemberDoc } from '@/features/ministry/domain/ministry.types';
import {
  canAccessMobileMinistryApplications,
  canReviewMobileMinistryApplication,
} from '@/permissions/mobileMinistryApplicationPermissions';
import { hasAnyRole, hasRole } from '@/permissions/mobilePermissions';

export interface ApproveApplicationPayload {
  reviewedBy: string;
  reviewNote?: string;
  assignedRole?: string;
}

export interface DeclineApplicationPayload {
  reviewedBy: string;
  declineReason: string;
}

export interface MinistryApplicationFilters {
  status?: string;
  ministryId?: string;
  searchQuery?: string;
}

export const ministryApplicationService = {
  /**
   * Subscribe to ministry applications for staff view.
   * Handles permissions and scoping by churchId and managedMinistryIds.
   */
  subscribeToStaffMinistryApplications(
    user: UserAccount | null | undefined,
    onData: (applications: MinistryApplication[]) => void
  ): () => void {
    if (!user || !user.churchId || !canAccessMobileMinistryApplications(user)) {
      onData([]);
      return () => {};
    }

    const churchId = user.churchId;
    const isFullAdmin = hasAnyRole(user, ['super_admin', 'church_admin', 'pastor']);

    const q = query(collection(getActiveDb(), 'ministryApplications'), where('churchId', '==', churchId));

    return onSnapshot(q, (snapshot) => {
      let apps = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MinistryApplication));

      // Filter for ministry leaders: only applications inside managedMinistryIds
      if (!isFullAdmin && hasRole(user, 'ministry_leader')) {
        const managedIds = user.managedMinistryIds || [];
        apps = apps.filter((a) => managedIds.includes(a.ministryId));
      }

      // Sort by submittedAt descending
      apps.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      onData(apps);
    });
  },

  /**
   * Approve application using atomic Firestore transaction:
   * - Validates permissions & status
   * - Updates application status to approved
   * - Creates/updates ministryMembers document (deterministic id: ministryId_memberId)
   * - Updates member.ministryIds
   * - Updates userAccount.assignedMinistryIds if applicable
   */
  async approveMinistryApplication(
    application: MinistryApplication,
    user: UserAccount,
    payload: ApproveApplicationPayload
  ): Promise<void> {
    if (!canReviewMobileMinistryApplication(user, application)) {
      throw new Error('You do not have permission to approve this application.');
    }
    if (application.status !== 'pending') {
      throw new Error('Only pending applications can be approved.');
    }

    const now = new Date().toISOString();
    const memberDocId = `${application.ministryId}_${application.memberId}`;
    const applicationRef = doc(getActiveDb(), 'ministryApplications', application.id);
    const memberRef = application.memberId ? doc(getActiveDb(), 'members', application.memberId) : null;
    const ministryMemberRef = doc(getActiveDb(), 'ministryMembers', memberDocId);
    const userRef = application.userId ? doc(getActiveDb(), 'users', application.userId) : null;

    const assignedRole = payload.assignedRole || (application.preferredRoleNames?.[0] || 'Member');

    await runTransaction(getActiveDb(), async (transaction) => {
      // 1. ALL READS FIRST
      const appSnap = await transaction.get(applicationRef);
      if (!appSnap.exists()) {
        throw new Error('Application document not found.');
      }
      const appData = appSnap.data() as MinistryApplication;
      if (appData.status !== 'pending') {
        throw new Error('Application is no longer pending.');
      }

      const memberSnap = memberRef ? await transaction.get(memberRef) : null;
      const userSnap = userRef ? await transaction.get(userRef) : null;

      // 2. ALL WRITES AFTER READS
      // Update application status
      transaction.update(applicationRef, {
        status: 'approved',
        reviewedBy: payload.reviewedBy,
        reviewedAt: now,
        ...(payload.reviewNote ? { reviewNote: payload.reviewNote, reviewNotes: payload.reviewNote } : {}),
        updatedAt: now,
      });

      // Set/update ministryMembers record
      const ministryMemberData: Omit<MinistryMemberDoc, 'id'> = {
        churchId: application.churchId,
        ministryId: application.ministryId,
        memberId: application.memberId,
        userId: application.userId,
        status: 'active',
        ministryRole: assignedRole,
        joinedAt: now,
        approvedBy: payload.reviewedBy,
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(ministryMemberRef, ministryMemberData, { merge: true });

      // Update member.ministryIds array if member doc exists
      if (memberRef && memberSnap && memberSnap.exists()) {
        transaction.update(memberRef, {
          ministryIds: arrayUnion(application.ministryId),
          updatedAt: now,
        });
      }

      // Update userAccount assignedMinistryIds if user doc exists
      if (userRef && userSnap && userSnap.exists()) {
        transaction.update(userRef, {
          assignedMinistryIds: arrayUnion(application.ministryId),
          updatedAt: now,
        });
      }
    });
  },

  /**
   * Decline application:
   * - Validates permission & status
   * - Saves declineReason and updates status to declined
   */
  async declineMinistryApplication(
    application: MinistryApplication,
    user: UserAccount,
    payload: DeclineApplicationPayload
  ): Promise<void> {
    if (!canReviewMobileMinistryApplication(user, application)) {
      throw new Error('You do not have permission to decline this application.');
    }
    if (application.status !== 'pending') {
      throw new Error('Only pending applications can be declined.');
    }

    const now = new Date().toISOString();
    const applicationRef = doc(getActiveDb(), 'ministryApplications', application.id);

    await runTransaction(getActiveDb(), async (transaction) => {
      const appSnap = await transaction.get(applicationRef);
      if (!appSnap.exists()) {
        throw new Error('Application document not found.');
      }
      const appData = appSnap.data() as MinistryApplication;
      if (appData.status !== 'pending') {
        throw new Error('Application is no longer pending.');
      }

      transaction.update(applicationRef, {
        status: 'declined',
        declineReason: payload.declineReason,
        reviewedBy: payload.reviewedBy,
        reviewedAt: now,
        updatedAt: now,
      });
    });
  },
};
