import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { prayerRepository } from '../../data/prayer.repository';
import type { Prayer } from '../../domain/prayer.types';

export function usePrayerFeed() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);

  const userProfile = useAuthStore((state) => state.userProfile);
  const churchId = userProfile?.churchId;

  useEffect(() => {
    if (!churchId) return;

    const unsubscribe = prayerRepository.subscribeToPrayers(
      churchId,
      (nextPrayers) => {
        setPrayers(nextPrayers);
        setLoading(false);
      },
      (error: any) => {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          setLoading(false);
          return;
        }
        console.error('Error fetching prayers:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [churchId]);

  const togglePrayerLike = useCallback(async (prayerId: string, userId: string) => {
    if (!churchId) return;
    await prayerRepository.togglePrayerLike(churchId, prayerId, userId);
  }, [churchId]);

  const togglePrayerAnswered = useCallback(async (prayerId: string, currentValue: boolean) => {
    if (!churchId) return;
    await prayerRepository.togglePrayerAnswered(churchId, prayerId, currentValue);
  }, [churchId]);

  const deletePrayer = useCallback(async (prayerId: string) => {
    if (!churchId) return;
    try {
      await prayerRepository.deletePrayerRequest(churchId, prayerId);
    } catch (error) {
      console.error('Error deleting prayer request:', error);
      throw error;
    }
  }, [churchId]);

  return {
    prayers,
    loading: churchId ? loading : false,
    togglePrayerLike,
    togglePrayerAnswered,
    deletePrayer,
  };
}
