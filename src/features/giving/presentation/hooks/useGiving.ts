import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { GivingCampaign, GivingFund, GivingRecord, PaymentMethod } from '../../domain/giving.types';
import * as givingRepo from '../../data/giving.repository';

export function useGiving() {
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((state) => state.currentUser);
  const churchId = userProfile?.churchId;
  const userId = currentUser?.uid;

  const [campaigns, setCampaigns] = useState<GivingCampaign[]>([]);
  const [funds, setFunds] = useState<GivingFund[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [myRecords, setMyRecords] = useState<GivingRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!churchId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedFunds, fetchedPaymentMethods] = await Promise.all([
        givingRepo.fetchGivingFunds(churchId),
        givingRepo.fetchPaymentMethods(churchId)
      ]);
      
      setFunds(fetchedFunds);
      setPaymentMethods(fetchedPaymentMethods);
      
      if (userId) {
        const fetchedRecords = await givingRepo.fetchMyGivingRecords(userId);
        setMyRecords(fetchedRecords);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch giving data');
    } finally {
      setIsLoading(false);
    }
  }, [churchId, userId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!churchId) return;
    return givingRepo.subscribeToActiveCampaigns(churchId, (newCampaigns) => {
      setCampaigns(newCampaigns);
    });
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    return givingRepo.subscribeToGivingFunds(churchId, (newFunds) => {
      setFunds(newFunds);
    });
  }, [churchId]);

  const refreshRecords = useCallback(async () => {
    if (!userId) return;
    try {
      const fetchedRecords = await givingRepo.fetchMyGivingRecords(userId);
      setMyRecords(fetchedRecords);
    } catch (err: any) {
      console.error('Failed to refresh giving records', err);
    }
  }, [userId]);

  return {
    campaigns,
    funds,
    paymentMethods,
    myRecords,
    isLoading,
    error,
    refreshData: fetchInitialData,
    refreshRecords,
  };
}
