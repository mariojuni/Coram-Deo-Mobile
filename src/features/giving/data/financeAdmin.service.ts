import { db } from '../../../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction, 
  setDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { GivingRecord, GivingExpense, CampaignStatus } from '../domain/giving.types';

const GIVING_COLLECTION = 'givingRecords';
const EXPENSE_COLLECTION = 'givingExpenses';
const CAMPAIGN_COLLECTION = 'givingCampaigns';

export async function createManualGivingRecord(
  churchId: string, 
  data: Partial<GivingRecord>, 
  currentUserId: string
): Promise<string> {
  const newRef = doc(collection(db, GIVING_COLLECTION));
  const recordId = newRef.id;

  await runTransaction(db, async (transaction) => {
    // If it belongs to a campaign, we need to increment the raisedAmount
    if (data.campaignId) {
      const campaignRef = doc(db, CAMPAIGN_COLLECTION, data.campaignId);
      const campaignSnap = await transaction.get(campaignRef);
      if (campaignSnap.exists()) {
        const currentAmount = campaignSnap.data().raisedAmount || 0;
        transaction.update(campaignRef, {
          raisedAmount: currentAmount + (data.amount || 0),
          updatedAt: serverTimestamp()
        });
      }
    }

    // Map fundId to human-readable fundType (web app legacy support)
    const mapFundIdToName = (fid: string) => {
      const lower = (fid || '').toLowerCase();
      if (lower.includes('tithe')) return 'Tithe';
      if (lower.includes('offering')) return 'Offering';
      if (lower.includes('building')) return 'Building Fund';
      if (lower.includes('mission')) return 'Missions';
      return 'Others';
    };

    const newRecord: Partial<GivingRecord> = {
      ...data,
      id: recordId,
      churchId,
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      fundType: mapFundIdToName(data.fundId || ''),
      method: data.paymentMethod || 'cash',
      notes: data.note || '',
      proofUrl: data.proofOfPaymentUrl || '',
      reviewedBy: currentUserId,
      reviewedAt: new Date().toISOString(),
      approvedBy: currentUserId,
      approvedAt: serverTimestamp(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    };

    transaction.set(newRef, newRecord);
  });

  return recordId;
}

export async function getPendingGivingRecords(churchId: string): Promise<GivingRecord[]> {
  const q = query(
    collection(db, GIVING_COLLECTION),
    where('churchId', '==', churchId),
    where('status', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );
  const snap = await getDocs(q);
  const records = snap.docs.map(d => {
    return { ...d.data(), id: d.id } as GivingRecord;
  });

  try {
    // Fetch users to map donor names correctly, just like web app
    const uq = query(collection(db, 'users'), where('churchId', '==', churchId));
    const usnap = await getDocs(uq);
    const usersMap: Record<string, string> = {};
    usnap.forEach(d => {
      usersMap[d.id] = d.data().name || 'Anonymous';
    });

    records.forEach(r => {
      if (!r.donorName && r.userId && usersMap[r.userId]) {
        r.donorName = usersMap[r.userId];
      }
    });
  } catch (err) {
    console.warn("Failed to fetch users for giving records", err);
  }

  return records;
}

export async function approveGivingRecord(
  churchId: string, 
  recordId: string, 
  campaignId: string | undefined, 
  amount: number, 
  currentUserId: string
): Promise<void> {
  const recordRef = doc(db, GIVING_COLLECTION, recordId);
  
  await runTransaction(db, async (transaction) => {
    const recordSnap = await transaction.get(recordRef);
    if (!recordSnap.exists()) throw new Error("Record not found");
    if (recordSnap.data().churchId !== churchId) throw new Error("Unauthorized");
    if (recordSnap.data().status !== 'pending') throw new Error("Record is not pending");

    if (campaignId) {
      const campaignRef = doc(db, CAMPAIGN_COLLECTION, campaignId);
      const campaignSnap = await transaction.get(campaignRef);
      if (campaignSnap.exists()) {
        const currentAmount = campaignSnap.data().raisedAmount || 0;
        transaction.update(campaignRef, {
          raisedAmount: currentAmount + amount,
          updatedAt: serverTimestamp()
        });
      }
    }

    // Map fundId to human-readable fundType (web app legacy support)
    const mapFundIdToName = (fid: string) => {
      const lower = (fid || '').toLowerCase();
      if (lower.includes('tithe')) return 'Tithe';
      if (lower.includes('offering')) return 'Offering';
      if (lower.includes('building')) return 'Building Fund';
      if (lower.includes('mission')) return 'Missions';
      return 'Others';
    };

    // Fetch the user to permanently save donorName
    let donorName = 'Anonymous';
    if (recordSnap.data().userId) {
      const userRef = doc(db, 'users', recordSnap.data().userId);
      const userSnap = await transaction.get(userRef);
      if (userSnap.exists()) {
        const d = userSnap.data();
        donorName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.name || d.displayName || 'Anonymous';
      }
    }

    transaction.update(recordRef, {
      status: 'completed', // 'completed' is used by web app
      reviewedBy: currentUserId,
      reviewedAt: new Date().toISOString(),
      approvedBy: currentUserId, // web app uses approvedBy
      approvedAt: serverTimestamp(), // web app uses approvedAt
      date: new Date().toISOString().split('T')[0], // web app uses YYYY-MM-DD string
      donorName,
      fundType: mapFundIdToName(recordSnap.data().fundId),
      method: recordSnap.data().paymentMethod || 'cash',
      notes: recordSnap.data().note || '',
      proofUrl: recordSnap.data().proofOfPaymentUrl || '',
      updatedAt: serverTimestamp()
    });
  });
}

export async function rejectGivingRecord(
  churchId: string,
  recordId: string,
  reason: string,
  currentUserId: string
): Promise<void> {
  const recordRef = doc(db, GIVING_COLLECTION, recordId);
  
  // We don't necessarily need a transaction here if we aren't modifying campaign totals, 
  // but we can just use updateDoc.
  await updateDoc(recordRef, {
    status: 'rejected',
    rejectionReason: reason,
    reviewedBy: currentUserId,
    reviewedAt: new Date().toISOString(),
    updatedAt: serverTimestamp()
  });
}

export async function createExpense(
  churchId: string, 
  data: Partial<GivingExpense>, 
  currentUserId: string
): Promise<string> {
  const newRef = doc(collection(db, EXPENSE_COLLECTION));
  const expenseId = newRef.id;

  const expense: Partial<GivingExpense> = {
    ...data,
    id: expenseId,
    churchId,
    recordedBy: currentUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(newRef, expense);
  return expenseId;
}

export async function getRecentExpenses(churchId: string, maxCount: number = 20): Promise<GivingExpense[]> {
  const q = query(
    collection(db, EXPENSE_COLLECTION),
    where('churchId', '==', churchId),
    orderBy('date', 'desc'),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as GivingExpense));
}

export async function getMonthlyFinanceSummary(churchId: string, startOfMonthIso: string): Promise<{ 
  totalGiving: number; 
  totalExpenses: number; 
  pendingCount: number;
  givingRecords: GivingRecord[];
  expenses: GivingExpense[];
}> {
  const startOfMonthDate = startOfMonthIso.split('T')[0];
  
  // Fetch approved/completed giving for this month
  const givingQ = query(
    collection(db, GIVING_COLLECTION),
    where('churchId', '==', churchId),
    where('status', 'in', ['approved', 'completed']),
    where('date', '>=', startOfMonthDate)
  );
  
  // Fetch expenses for this month
  const expenseQ = query(
    collection(db, EXPENSE_COLLECTION),
    where('churchId', '==', churchId),
    where('date', '>=', startOfMonthDate)
  );

  // Fetch pending count
  const pendingQ = query(
    collection(db, GIVING_COLLECTION),
    where('churchId', '==', churchId),
    where('status', '==', 'pending')
  );

  const [givingSnap, expenseSnap, pendingSnap] = await Promise.all([
    getDocs(givingQ),
    getDocs(expenseQ),
    getDocs(pendingQ)
  ]);

  const totalGiving = givingSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
  const totalExpenses = expenseSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

  const givingRecords = givingSnap.docs
    .map(d => ({ ...d.data(), id: d.id } as GivingRecord))
    .sort((a, b) => new Date(b.date || b.submittedAt).getTime() - new Date(a.date || a.submittedAt).getTime());

  // Fetch users for donor names
  const userIds = [...new Set(givingRecords.map(r => r.userId))].filter(Boolean);
  const usersMap = new Map<string, string>();
  if (userIds.length > 0) {
    try {
      const usersQ = query(collection(db, 'users'), where('churchId', '==', churchId));
      const uSnap = await getDocs(usersQ);
      uSnap.forEach(u => {
        const data = u.data();
        usersMap.set(u.id, `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || data.displayName || 'Anonymous');
      });
    } catch (e) {
      console.warn('Failed to fetch users for finance summary', e);
    }
  }

  // Populate donorName
  givingRecords.forEach(r => {
    if (!r.donorName) {
      r.donorName = usersMap.get(r.userId) || 'Anonymous';
    }
  });

  const expenses = expenseSnap.docs
    .map(d => ({ ...d.data(), id: d.id } as GivingExpense))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    totalGiving,
    totalExpenses,
    pendingCount: pendingSnap.size,
    givingRecords,
    expenses
  };
}
