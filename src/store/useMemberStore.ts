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

export const useMemberStore = create<MemberStore>((set) => ({
  members: [],
  services: [],
  membersLoading: true,
  servicesLoading: true,
  initializeMembersListener: (churchId?: string | null) => {
    if (!churchId) {
      set({ members: [], membersLoading: false });
      return;
    }
    memberRepository.subscribeToMembers(churchId,
      (members) => {
        set({ members, membersLoading: false });
      },
      (error) => {
        console.error('Error fetching users:', error);
        set({ membersLoading: false });
      }
    );
  },

  initializeServicesListener: (churchId?: string | null) => {
    if (!churchId) {
      set({ services: [], servicesLoading: false });
      return;
    }
    memberRepository.subscribeToServices(churchId,
      (services) => {
        set({ services, servicesLoading: false });
      },
      (error) => {
        console.error('Error fetching services:', error);
        set({ servicesLoading: false });
      }
    );
  }
}));
