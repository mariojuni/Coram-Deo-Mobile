import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import type { MinistryApplication } from '@/features/ministry/domain/ministry.types';
import { create } from 'zustand';

interface MinistryApplicationStore {
  myApplications: MinistryApplication[];
  loading: boolean;
  subscribeToMyApplications: (churchId: string, memberId: string) => () => void;
  submitApplication: (data: Omit<MinistryApplication, 'id'>) => Promise<string>;
  withdrawApplication: (id: string) => Promise<void>;
}

let unsubscribe: (() => void) | null = null;
let subscriberCount = 0;

export const useMinistryApplicationStore = create<MinistryApplicationStore>((set) => ({
  myApplications: [],
  loading: false,

  subscribeToMyApplications: (churchId: string, memberId: string) => {
    subscriberCount += 1;
    if (!unsubscribe) {
      set({ loading: true });
      unsubscribe = ministryRepository.subscribeToMemberApplications(
        churchId,
        memberId,
        (data) => {
          set({ myApplications: data, loading: false });
        }
      );
    }
    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      if (subscriberCount === 0 && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
  },

  submitApplication: async (data) => {
    return ministryRepository.submitApplication(data);
  },

  withdrawApplication: async (id) => {
    await ministryRepository.withdrawApplication(id);
  },
}));
