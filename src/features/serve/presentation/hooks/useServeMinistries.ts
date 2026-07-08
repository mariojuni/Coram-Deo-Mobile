import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useEffect } from 'react';

export function useServeMinistries() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const { ministries, ministriesLoading, fetchMinistries } = useMinistryStore();

  const churchId = userProfile?.churchId ?? null;

  useEffect(() => {
    if (!churchId) return;
    fetchMinistries(churchId);
  }, [churchId, fetchMinistries]);

  const activeMinistries = ministries.filter(
    (m) => m.status === 'Active' || m.status === 'active' || !m.status
  );

  return {
    ministries: activeMinistries,
    loading: ministriesLoading,
    hasChurchId: !!churchId,
  };
}
