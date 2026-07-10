import { db, storage } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GivingFund, GivingCampaign, GivingRecord, PaymentMethod } from '../domain/giving.types';

export async function fetchActiveCampaigns(churchId: string): Promise<GivingCampaign[]> {
  try {
    const q = query(
      collection(db, 'givingCampaigns'),
      where('churchId', '==', churchId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [
        { 
          id: 'camp_1', churchId, fundId: 'fund_building', title: 'Building Fund 2026', 
          description: 'Help us build the new sanctuary', goalAmount: 500000, 
          raisedAmount: 120500, expenseAmount: 0, campaignType: 'building_project', 
          status: 'active', startDate: new Date().toISOString(), 
          coverImageUrl: 'https://images.unsplash.com/photo-1548625361-9c6bc7631da7',
          allowPublicProgress: true, allowPublicExpenses: false,
          createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        }
      ] as GivingCampaign[];
    }
    return snapshot.docs.map(doc => doc.data() as GivingCampaign);
  } catch (err) {
    console.warn('Error fetching campaigns, using mock', err);
    return [
      { 
        id: 'camp_1', churchId, fundId: 'fund_building', title: 'Building Fund 2026', 
        description: 'Help us build the new sanctuary', goalAmount: 500000, 
        raisedAmount: 120500, expenseAmount: 0, campaignType: 'building_project', 
        status: 'active', startDate: new Date().toISOString(), 
        coverImageUrl: 'https://images.unsplash.com/photo-1548625361-9c6bc7631da7',
        allowPublicProgress: true, allowPublicExpenses: false,
        createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ] as GivingCampaign[];
  }
}

export async function fetchGivingFunds(churchId: string): Promise<GivingFund[]> {
  const fallback: GivingFund[] = [
    { id: 'fund_tithe', churchId, name: 'Tithes', description: 'General tithes', isActive: true, type: 'tithe', visibility: 'public', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'fund_offering', churchId, name: 'Offering', description: 'General offering', isActive: true, type: 'offering', visibility: 'public', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'fund_missions', churchId, name: 'Missions', description: 'Missions fund', isActive: true, type: 'missions', visibility: 'public', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'fund_building', churchId, name: 'Building', description: 'Building fund', isActive: true, type: 'building', visibility: 'public', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  try {
    const q = query(
      collection(db, 'givingFunds'),
      where('churchId', '==', churchId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return fallback;
    return snapshot.docs.map(doc => doc.data() as GivingFund);
  } catch (err) {
    console.warn('Error fetching funds, using mock', err);
    return fallback;
  }
}

export async function fetchPaymentMethods(churchId: string): Promise<PaymentMethod[]> {
  const fallback: PaymentMethod[] = [
    { id: 'pay_card', churchId, type: 'other', displayName: 'Credit/Debit Card', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pay_gcash', churchId, type: 'gcash', displayName: 'GCash', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pay_maya', churchId, type: 'maya', displayName: 'Maya', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pay_bank', churchId, type: 'bank_transfer', displayName: 'Bank Transfer', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  try {
    const q = query(
      collection(db, 'paymentMethods'),
      where('churchId', '==', churchId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return fallback;
    return snapshot.docs.map(doc => doc.data() as PaymentMethod);
  } catch (err) {
    console.warn('Error fetching payment methods, using mock', err);
    return fallback;
  }
}

export async function fetchMyGivingRecords(userId: string): Promise<GivingRecord[]> {
  try {
    const q = query(
      collection(db, 'givingRecords'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as GivingRecord);
  } catch (err) {
    console.warn('Error fetching my giving records (possibly missing index):', err);
    // If index is missing, try fetching without orderBy and sort in memory
    const fallbackQ = query(
      collection(db, 'givingRecords'),
      where('userId', '==', userId)
    );
    const fallbackSnapshot = await getDocs(fallbackQ);
    const records = fallbackSnapshot.docs.map(doc => doc.data() as GivingRecord);
    return records.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Date.now();
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Date.now();
      return timeB - timeA;
    });
  }
}

export async function uploadProofOfPayment(churchId: string, userId: string, fileUri: string): Promise<string> {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  
  const fileExt = fileUri.split('.').pop() || 'jpg';
  const fileName = `${doc(collection(db, 'dummy')).id}.${fileExt}`;
  
  const storageRef = ref(storage, `giving/${churchId}/${userId}/proofs/${fileName}`);
  await uploadBytes(storageRef, blob);
  
  return await getDownloadURL(storageRef);
}

export async function submitGivingRecord(record: Omit<GivingRecord, 'id' | 'createdAt' | 'updatedAt' | 'submittedAt' | 'status'>): Promise<string> {
  const recordRef = doc(collection(db, 'givingRecords'));
  const recordId = recordRef.id;
  
  const fullRecord = {
    ...record,
    id: recordId,
    status: 'pending',
    submittedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(recordRef, fullRecord);
  return recordId;
}
