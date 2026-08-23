import { getActiveDb } from '../../../firebase';
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
import { GivingRecord, GivingExpense, CampaignStatus, ExpenseCategoryModel } from '../domain/giving.types';

const GIVING_COLLECTION = 'givingRecords';
const EXPENSE_COLLECTION = 'givingExpenses';
const CAMPAIGN_COLLECTION = 'givingCampaigns';
const EXPENSE_CATEGORIES_COLLECTION = 'expenseCategories';

export async function createManualGivingRecord(
  churchId: string, 
  data: Partial<GivingRecord>, 
  currentUserId: string
): Promise<string> {
  const newRef = doc(collection(getActiveDb(), GIVING_COLLECTION));
  const recordId = newRef.id;

  await runTransaction(getActiveDb(), async (transaction) => {
    // 1. ALL READS FIRST
    let campaignSnap = null;
    let campaignRef = null;
    if (data.campaignId) {
      campaignRef = doc(getActiveDb(), CAMPAIGN_COLLECTION, data.campaignId);
      campaignSnap = await transaction.get(campaignRef);
    }

    let fetchedFundType = data.fundType || 'Others';
    if (data.fundId) {
      try {
        const fundRef = doc(getActiveDb(), 'givingFunds', data.fundId);
        const fundSnap = await transaction.get(fundRef);
        if (fundSnap.exists() && fundSnap.data().name) {
          fetchedFundType = fundSnap.data().name;
        }
      } catch (err) {
        console.warn('Failed to fetch fund name on createManualGivingRecord', err);
      }
    }

    // 2. ALL WRITES
    if (campaignSnap && campaignSnap.exists() && campaignRef) {
      const currentAmount = campaignSnap.data().raisedAmount || 0;
      transaction.update(campaignRef, {
        raisedAmount: currentAmount + (data.amount || 0),
        updatedAt: serverTimestamp()
      });
    }

    const newRecord: Partial<GivingRecord> = {
      ...data,
      id: recordId,
      churchId,
      status: 'completed',
      date: data.date || new Date().toISOString().split('T')[0],
      transactionDate: data.date || new Date().toISOString().split('T')[0],
      fundType: fetchedFundType,
      method: data.method || 'cash',
      notes: data.notes || '',
      proofUrl: data.proofUrl || '',
      reviewedBy: currentUserId,
      reviewedAt: new Date().toISOString(),
      approvedBy: currentUserId,
      approvedAt: serverTimestamp(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    } as any;

    Object.keys(newRecord).forEach(key => {
      if ((newRecord as any)[key] === undefined) {
        delete (newRecord as any)[key];
      }
    });

    transaction.set(newRef, newRecord);
  });

  return recordId;
}

export async function getPendingGivingRecords(churchId: string): Promise<GivingRecord[]> {
  const q = query(
    collection(getActiveDb(), GIVING_COLLECTION),
    where('churchId', '==', churchId),
    where('status', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );
  const snap = await getDocs(q);
  const records = snap.docs.map(d => {
    return { ...d.data(), id: d.id } as GivingRecord;
  });

  try {
    // Fetch users to map donor names correctly, just like finance summary
    const uq = query(collection(getActiveDb(), 'users'), where('churchId', '==', churchId));
    const usnap = await getDocs(uq);
    const usersMap: Record<string, string> = {};
    usnap.forEach(d => {
      const data = d.data();
      const middleInitial = data.middleName ? `${data.middleName.charAt(0).toUpperCase()}.` : '';
      const fullName = [data.firstName, middleInitial, data.lastName].filter(Boolean).join(' ').trim();
      usersMap[d.id] = fullName || data.name || data.displayName || 'Anonymous';
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
  const recordRef = doc(getActiveDb(), GIVING_COLLECTION, recordId);
  
  await runTransaction(getActiveDb(), async (transaction) => {
    // 1. ALL READS FIRST
    const recordSnap = await transaction.get(recordRef);
    if (!recordSnap.exists()) throw new Error("Record not found");
    const recordData = recordSnap.data();
    if (recordData.churchId !== churchId) throw new Error("Unauthorized");
    if (recordData.status !== 'pending') throw new Error("Record is not pending");

    let campaignSnap = null;
    let campaignRef = null;
    if (campaignId) {
      campaignRef = doc(getActiveDb(), CAMPAIGN_COLLECTION, campaignId);
      campaignSnap = await transaction.get(campaignRef);
    }

    // Fetch actual fund name to populate fundType accurately
    let fundType = 'Others';
    const fundId = recordData.fundId;
    if (fundId) {
      try {
        const fundRef = doc(getActiveDb(), 'givingFunds', fundId);
        const fundSnap = await transaction.get(fundRef);
        if (fundSnap.exists() && fundSnap.data().name) {
          fundType = fundSnap.data().name;
        }
      } catch (err) {
        console.warn('Failed to fetch fund name on approval', err);
      }
    }

    // 2. ALL WRITES
    if (campaignSnap && campaignSnap.exists() && campaignRef) {
      const currentAmount = campaignSnap.data().raisedAmount || 0;
      transaction.update(campaignRef, {
        raisedAmount: currentAmount + amount,
        updatedAt: serverTimestamp()
      });
    }

    transaction.update(recordRef, {
      status: 'completed', // 'completed' is used by web app
      approvedBy: currentUserId,
      approvedAt: serverTimestamp(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD string
      fundType,
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
  const recordRef = doc(getActiveDb(), GIVING_COLLECTION, recordId);
  
  // We don't necessarily need a transaction here if we aren't modifying campaign totals, 
  // but we can just use updateDoc.
  await updateDoc(recordRef, {
    status: 'rejected',
    rejectionReason: reason,
    rejectedBy: currentUserId,
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function createExpense(
  churchId: string, 
  data: Partial<GivingExpense>, 
  currentUserId: string
): Promise<string> {
  const expenseId = data.id || doc(collection(getActiveDb(), EXPENSE_COLLECTION)).id;
  const newRef = doc(getActiveDb(), EXPENSE_COLLECTION, expenseId);

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
    collection(getActiveDb(), EXPENSE_COLLECTION),
    where('churchId', '==', churchId),
    orderBy('date', 'desc'),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as GivingExpense));
}

export async function getActiveExpenseCategories(churchId: string): Promise<ExpenseCategoryModel[]> {
  const q = query(
    collection(getActiveDb(), EXPENSE_CATEGORIES_COLLECTION),
    where('churchId', '==', churchId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as ExpenseCategoryModel)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMonthlyFinanceSummary(churchId: string, startOfMonthIso?: string): Promise<{ 
  totalGiving: number; 
  totalExpenses: number; 
  pendingCount: number;
  givingRecords: GivingRecord[];
  expenses: GivingExpense[];
}> {
  const iso = startOfMonthIso || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const startOfMonthDate = iso.split('T')[0];
  
  // Fetch approved/completed giving for this month
  const givingQ = query(
    collection(getActiveDb(), GIVING_COLLECTION),
    where('churchId', '==', churchId),
    where('status', 'in', ['approved', 'completed']),
    where('date', '>=', startOfMonthDate)
  );
  
  // Fetch expenses for this month
  const expenseQ = query(
    collection(getActiveDb(), EXPENSE_COLLECTION),
    where('churchId', '==', churchId),
    where('date', '>=', startOfMonthDate)
  );

  // Fetch pending count
  const pendingQ = query(
    collection(getActiveDb(), GIVING_COLLECTION),
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
      const usersQ = query(collection(getActiveDb(), 'users'), where('churchId', '==', churchId));
      const uSnap = await getDocs(usersQ);
      uSnap.forEach(u => {
        const data = u.data();
        const middleInitial = data.middleName ? `${data.middleName.charAt(0).toUpperCase()}.` : '';
        const fullName = [data.firstName, middleInitial, data.lastName].filter(Boolean).join(' ').trim();
        usersMap.set(u.id, fullName || data.name || data.displayName || 'Anonymous');
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
