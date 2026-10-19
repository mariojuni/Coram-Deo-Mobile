import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { getActiveDb } from '../firebase';
import { 
  ChurchCurrencyConfig, 
  DEFAULT_CURRENCY_CONFIG, 
  normalizeCurrencyConfig 
} from '../config/currencies';

export interface ChurchProfileData {
  id?: string;
  name?: string;
  churchName?: string;
  shortName?: string;
  currency: ChurchCurrencyConfig;
  timezone?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
}

interface ChurchState {
  churchId: string | null;
  church: ChurchProfileData | null;
  currency: ChurchCurrencyConfig;
  loading: boolean;
  initializeChurchListener: (churchId: string | null | undefined) => void;
  clearChurchListener: () => void;
}

let unsubscribeChurch: (() => void) | null = null;
let activeSubscribedChurchId: string | null = null;

export const useChurchStore = create<ChurchState>((set) => ({
  churchId: null,
  church: null,
  currency: DEFAULT_CURRENCY_CONFIG,
  loading: false,

  initializeChurchListener: (churchId) => {
    if (!churchId) {
      if (unsubscribeChurch) {
        unsubscribeChurch();
        unsubscribeChurch = null;
      }
      activeSubscribedChurchId = null;
      set({ churchId: null, church: null, currency: DEFAULT_CURRENCY_CONFIG, loading: false });
      return;
    }

    if (activeSubscribedChurchId === churchId && unsubscribeChurch) {
      return;
    }

    if (unsubscribeChurch) {
      unsubscribeChurch();
      unsubscribeChurch = null;
    }

    activeSubscribedChurchId = churchId;
    set({ churchId, loading: true });

    const cacheKey = `@church_profile_cache_${churchId}`;
    AsyncStorage.getItem(cacheKey).then((raw) => {
      if (raw) {
        try {
          const cached = JSON.parse(raw);
          if (cached && activeSubscribedChurchId === churchId) {
            set({
              church: cached,
              currency: normalizeCurrencyConfig(cached.currency),
            });
          }
        } catch (_) {}
      }
    });

    try {
      const docRef = doc(getActiveDb(), 'churches', churchId);
      unsubscribeChurch = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const normalizedCurrency = normalizeCurrencyConfig(data.currency || {
              code: data.currencyCode,
              symbol: data.currencySymbol,
            });

            const profile: ChurchProfileData = {
              id: snap.id,
              name: data.name || data.churchName || '',
              churchName: data.churchName || data.name || '',
              shortName: data.shortName || '',
              currency: normalizedCurrency,
              timezone: data.timezone || 'Asia/Manila',
              logoUrl: data.logoUrl || '',
              address: data.address || '',
              city: data.city || '',
              province: data.province || '',
              country: data.country || 'Philippines',
            };

            set({
              church: profile,
              currency: normalizedCurrency,
              loading: false,
            });

            AsyncStorage.setItem(cacheKey, JSON.stringify(profile)).catch(() => {});
          } else {
            set({ loading: false });
          }
        },
        (err) => {
          console.warn('Error listening to church profile doc:', err);
          set({ loading: false });
        }
      );
    } catch (err) {
      console.warn('Failed to attach church listener:', err);
      set({ loading: false });
    }
  },

  clearChurchListener: () => {
    if (unsubscribeChurch) {
      unsubscribeChurch();
      unsubscribeChurch = null;
    }
    activeSubscribedChurchId = null;
    set({ churchId: null, church: null, currency: DEFAULT_CURRENCY_CONFIG, loading: false });
  },
}));
