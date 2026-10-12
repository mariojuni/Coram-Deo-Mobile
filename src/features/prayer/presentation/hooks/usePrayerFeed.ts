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
    if (!churchId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Load cached prayers immediately for offline or fast display
    prayerRepository.getCachedPrayers(churchId).then((cached) => {
      if (isMounted && cached && cached.length > 0) {
        setPrayers((prev) => (prev.length === 0 ? cached : prev));
        setLoading(false);
      }
    }).catch(console.error);

    const unsubscribe = prayerRepository.subscribeToPrayers(
      churchId,
      (nextPrayers) => {
        if (isMounted) {
          setPrayers(nextPrayers);
          setLoading(false);
        }
      },
      (error: any) => {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          if (isMounted) setLoading(false);
          return;
        }
        console.error('Error fetching prayers:', error);
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
