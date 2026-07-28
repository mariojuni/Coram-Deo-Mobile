import { create } from 'zustand';
import { memberRepository } from '../features/member/data/member.repository';
import type { Member, Service } from '../features/member/domain/member.types';

interface MemberStore {
  members: Member[];
  services: Service[];
  membersLoading: boolean;
  servicesLoading: boolean;
  initializeMembersListener: (churchId?: string | null) => void;
  initializeServicesListener: (churchId?: string | null) => void;
}

let unsubscribeMembers: (() => void) | null = null;
let unsubscribeServices: (() => void) | null = null;

export const useMemberStore = create<MemberStore>((set) => ({
  members: [],
  services: [],
  membersLoading: true,
  servicesLoading: true,
  initializeMembersListener: (churchId?: string | null) => {
    if (unsubscribeMembers) {
      unsubscribeMembers();
      unsubscribeMembers = null;
    }
    if (!churchId) {
      set({ members: [], membersLoading: false });
      return;
    }
    unsubscribeMembers = memberRepository.subscribeToMembers(churchId,
      (members) => {
        set({ members, membersLoading: false });
      },
      (error: any) => {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          set({ membersLoading: false });
          return;
        }
        console.error('Error fetching users:', error);
        set({ membersLoading: false });
      }
    );
  },

  initializeServicesListener: (churchId?: string | null) => {
    if (unsubscribeServices) {
      unsubscribeServices();
      unsubscribeServices = null;
    }
    if (!churchId) {
      set({ services: [], servicesLoading: false });
      return;
    }
    unsubscribeServices = memberRepository.subscribeToServices(churchId,
      (services) => {
        set({ services, servicesLoading: false });
      },
      (error: any) => {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          set({ servicesLoading: false });
          return;
        }
        console.error('Error fetching services:', error);
        set({ servicesLoading: false });
      }
    );
  }
}));
