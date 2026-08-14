import { create } from 'zustand';
import { memberRepository } from '../features/member/data/member.repository';
import type { Member, Service, Household } from '../features/member/domain/member.types';

interface MemberStore {
  members: Member[];
  services: Service[];
  households: Household[];
  membersLoading: boolean;
  servicesLoading: boolean;
  householdsLoading: boolean;
  initializeMembersListener: (churchId?: string | null) => void;
  initializeServicesListener: (churchId?: string | null) => void;
  initializeHouseholdsListener: (churchId?: string | null) => void;
}

let unsubscribeMembers: (() => void) | null = null;
let unsubscribeServices: (() => void) | null = null;
let unsubscribeHouseholds: (() => void) | null = null;

export const useMemberStore = create<MemberStore>((set) => ({
  members: [],
  services: [],
  households: [],
  membersLoading: true,
  servicesLoading: true,
  householdsLoading: true,
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
  },

  initializeHouseholdsListener: (churchId?: string | null) => {
    if (unsubscribeHouseholds) {
      unsubscribeHouseholds();
      unsubscribeHouseholds = null;
    }
    if (!churchId) {
      set({ households: [], householdsLoading: false });
      return;
    }
    unsubscribeHouseholds = memberRepository.subscribeToHouseholds(churchId,
      (households) => {
        set({ households, householdsLoading: false });
      },
      (error: any) => {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          set({ householdsLoading: false });
          return;
        }
        console.error('Error fetching households:', error);
        set({ householdsLoading: false });
      }
    );
  }
}));
