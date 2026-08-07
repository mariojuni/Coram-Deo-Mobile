import { getActiveDb, storage } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, orderBy, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GivingFund, GivingCampaign, GivingRecord, PaymentMethod } from '../domain/giving.types';

export async function fetchActiveCampaigns(churchId: string): Promise<GivingCampaign[]> {
  if (!churchId) return [];
  try {
    const q = query(
      collection(getActiveDb(), 'givingCampaigns'),
      where('churchId', '==', churchId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as GivingCampaign))
      .filter(c => {
        const s = (c.status || '').toLowerCase();
        return s === 'active' || (s !== 'archived' && s !== 'completed' && s !== 'draft');
      });
  } catch (err) {
    console.warn('Error fetching campaigns:', err);
    return [];
  }
}

export function subscribeToActiveCampaigns(churchId: string, callback: (campaigns: GivingCampaign[]) => void): () => void {
  if (!churchId) return () => {};
  const q = query(
    collection(getActiveDb(), 'givingCampaigns'),
    where('churchId', '==', churchId)
  );
  return onSnapshot(q, (snapshot) => {
    const active = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as GivingCampaign))
      .filter(c => {
        const s = (c.status || '').toLowerCase();
        return s === 'active' || (s !== 'archived' && s !== 'completed' && s !== 'draft');
      });
    callback(active);
  }, (err) => {
    console.warn('Error subscribing to campaigns:', err);
    callback([]);
  });
}

export async function fetchGivingFunds(churchId: string): Promise<GivingFund[]> {
  if (!churchId) return [];
  try {
    const q = query(
      collection(getActiveDb(), 'givingFunds'),
      where('churchId', '==', churchId)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as GivingFund))
      .filter(fund => fund.isActive !== false && fund.status !== 'archived');
  } catch (err) {
    console.warn('Error fetching funds:', err);
    return [];
  }
}

export function subscribeToGivingFunds(churchId: string, callback: (funds: GivingFund[]) => void): () => void {
  if (!churchId) return () => {};
  const q = query(
    collection(getActiveDb(), 'givingFunds'),
    where('churchId', '==', churchId)
  );
  return onSnapshot(q, (snapshot) => {
    const funds = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as GivingFund))
      .filter(fund => fund.isActive !== false && fund.status !== 'archived');
    console.log('[subscribeToGivingFunds] Fetched docs count:', snapshot.docs.length, 'Filtered funds count:', funds.length);
    callback(funds);
  }, (err) => {
    console.warn('Error subscribing to giving funds:', err);
    callback([]);
  });
}

export async function fetchPaymentMethods(churchId: string): Promise<PaymentMethod[]> {
  const fallback: PaymentMethod[] = [
    { id: 'pay_card', churchId, type: 'other', displayName: 'Credit/Debit Card', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pay_gcash', churchId, type: 'gcash', displayName: 'GCash', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pay_maya', churchId, type: 'maya', displayName: 'Maya', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pay_bank', churchId, type: 'bank_transfer', displayName: 'Bank Transfer', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  if (!churchId) return fallback;
  try {
    const q = query(
      collection(getActiveDb(), 'paymentMethods'),
      where('churchId', '==', churchId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return fallback;
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod));
  } catch (err) {
    console.warn('Error fetching payment methods, using mock', err);
    return fallback;
  }
}

export async function fetchMyGivingRecords(userId: string): Promise<GivingRecord[]> {
  try {
    const q = query(
      collection(getActiveDb(), 'givingRecords'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GivingRecord));
  } catch (err) {
    console.warn('Error fetching my giving records (possibly missing index):', err);
    // If index is missing, try fetching without orderBy and sort in memory
    const fallbackQ = query(
      collection(getActiveDb(), 'givingRecords'),
      where('userId', '==', userId)
    );
    const fallbackSnapshot = await getDocs(fallbackQ);
    const records = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GivingRecord));
    return records.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Date.now();
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Date.now();
      return timeB - timeA;
    });
  }
}

export function generateGivingRecordId(): string {
  return doc(collection(getActiveDb(), 'givingRecords')).id;
}

export async function uploadProofOfPayment(churchId: string, recordId: string, fileUri: string): Promise<string> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function() {
      resolve(xhr.response as Blob);
    };
    xhr.onerror = function(e) {
      reject(new TypeError('Network request failed'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', fileUri, true);
    xhr.send(null);
  });
  
  const fileExt = fileUri.split('.').pop() || 'jpg';
  const fileName = `${recordId}.${fileExt}`;
  
  const storageRef = ref(storage, `churches/${churchId}/receipt/${recordId}/${fileName}`);
  await uploadBytes(storageRef, blob);
  
  return await getDownloadURL(storageRef);
}

export async function submitGivingRecord(record: Omit<GivingRecord, 'id' | 'createdAt' | 'updatedAt' | 'submittedAt' | 'status'>, recordId?: string): Promise<string> {
  const finalRecordId = recordId || doc(collection(getActiveDb(), 'givingRecords')).id;
  const recordRef = doc(getActiveDb(), 'givingRecords', finalRecordId);
  
  const fullRecord = {
    ...record,
    id: finalRecordId,
    status: 'pending',
    submittedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Strip undefined values since Firestore setDoc throws an error on undefined
  const cleanRecord = Object.fromEntries(
    Object.entries(fullRecord).filter(([_, v]) => v !== undefined)
  );

  await setDoc(recordRef, cleanRecord);
  return recordId;
}
