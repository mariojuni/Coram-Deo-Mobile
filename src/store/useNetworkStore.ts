import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  isInitialized: boolean;
  setNetworkState: (state: Partial<NetInfoState>) => void;
  initializeListener: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: true, // Optimistically assume connected until NetInfo reports otherwise
  isInternetReachable: true,
  connectionType: 'unknown',
  isInitialized: false,

  setNetworkState: (netState) => {
    const wasOffline = !get().isConnected;
    const isNowOnline = !!netState.isConnected;

    set({
      isConnected: netState.isConnected ?? true,
      isInternetReachable: netState.isInternetReachable ?? null,
      connectionType: netState.type ?? 'unknown',
      isInitialized: true,
    });

    if (wasOffline && isNowOnline && get().isInitialized) {
      // Silently refresh profile in background when connection is restored
      import('./useAuthStore')
        .then((m) => {
          m.useAuthStore.getState().refreshUserProfile().catch(() => {});
        })
        .catch(() => {});
    }
  },

  initializeListener: () => {
    // Fetch initial state
    NetInfo.fetch().then((state) => {
      get().setNetworkState(state);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      get().setNetworkState(state);
    });

    return unsubscribe;
  },
}));
