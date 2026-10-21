import '@testing-library/react-native';

// Mock Worklets Proxy and Globals
(globalThis as any)._WORKLETS_VERSION_JS = '0.10.1';
(globalThis as any)._WORKLETS_BUNDLE_MODE_ENABLED = false;
(global as any).__workletsModuleProxy = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === 'loadUnpackers') return jest.fn();
      return jest.fn(() => ({}));
    },
  }
);



jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});



// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js')
);

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock Expo Blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
}));

// Mock Expo Linear Gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

// Mock Expo FileSystem
const mockFileSystem = {
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false, isDirectory: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///cached/file.pdf' }),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-file-system/legacy', () => mockFileSystem);
jest.mock('expo-file-system', () => ({
  ...mockFileSystem,
  Paths: {
    cache: { uri: 'file:///cache/' },
    document: { uri: 'file:///documents/' },
  },
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const createMockComponent = (name: string) => {
    const Comp = (props: any) => React.createElement(View, { testID: name, ...props });
    Comp.displayName = name;
    return Comp;
  };
  return {
    __esModule: true,
    default: createMockComponent('Svg'),
    Svg: createMockComponent('Svg'),
    Path: createMockComponent('Path'),
    Circle: createMockComponent('Circle'),
    Defs: createMockComponent('Defs'),
    LinearGradient: createMockComponent('LinearGradient'),
    RadialGradient: createMockComponent('RadialGradient'),
    Stop: createMockComponent('Stop'),
    Rect: createMockComponent('Rect'),
    G: createMockComponent('G'),
  };
});




// Mock Google Signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}));

// Mock Apple Authentication
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));




// Mock Lucide Icons to prevent complex SVG issues in jsdom/node test runtime
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        const MockIcon = (props: any) =>
          React.createElement(View, { testID: `lucide-${String(prop)}`, ...props });
        MockIcon.displayName = `Lucide.${String(prop)}`;
        return MockIcon;
      },
    }
  );
});

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
    setParams: jest.fn(),
  })),
  useLocalSearchParams: () => ({}),
  useSegments: () => ['(tabs)', 'home'],
  useFocusEffect: jest.fn((cb: any) => {
    const cleanup = cb();
    return typeof cleanup === 'function' ? cleanup : undefined;
  }),
  Link: ({ children, onPress }: any) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return React.createElement(TouchableOpacity, { onPress }, children);
  },
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// Mock Firebase App
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'test-app', options: {} })),
  deleteApp: jest.fn().mockResolvedValue(undefined),
  getApps: jest.fn(() => []),
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: { credential: jest.fn() },
  OAuthProvider: jest.fn(),
  signInWithCredential: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
  deleteUser: jest.fn(),
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  getReactNativePersistence: jest.fn(),
  getAuth: jest.fn(() => ({ currentUser: null })),
}));

// Mock Firebase Web SDK / Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((dbOrCol, ...segments) => {
    const basePath = dbOrCol?.path ? [dbOrCol.path] : [];
    const allSegments = [...basePath, ...segments];
    return {
      path: allSegments.join('/'),
      id: allSegments[allSegments.length - 1] || 'mock-doc-ref',
    };
  }),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  onSnapshot: jest.fn(() => () => {}),
  collection: jest.fn((_db, ...segments) => ({
    path: segments.join('/'),
    id: segments[segments.length - 1] || 'mock-col-ref',
  })),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  addDoc: jest.fn().mockResolvedValue({ id: 'mock-doc-id' }),
  runTransaction: jest.fn(),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn((...args: any[]) => args),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  or: jest.fn(),
  serverTimestamp: jest.fn(() => '2026-10-21T00:00:00.000Z'),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date('2026-10-21T00:00:00.000Z'),
      seconds: 1792540800,
      nanoseconds: 0,
    })),
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
    })),
  },
  startAfter: jest.fn(),
  arrayUnion: jest.fn((...args: any[]) => ({ _method: 'arrayUnion', elements: args })),
  arrayRemove: jest.fn((...args: any[]) => ({ _method: 'arrayRemove', elements: args })),
  increment: jest.fn((n: number) => ({ _method: 'increment', value: n })),
  documentId: jest.fn(() => '__name__'),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  })),
  collectionGroup: jest.fn((_db, name) => ({ path: name, id: name })),
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn().mockResolvedValue({}),
  getDownloadURL: jest.fn().mockResolvedValue('https://example.com/file.jpg'),
}));


const mockFirebaseModule = {
  getActiveApp: jest.fn(() => ({ name: 'test-app', options: { projectId: 'test-project' } })),
  getActiveAuth: jest.fn(() => ({
    app: { name: 'test-app', options: { projectId: 'test-project' } },
    currentUser: null,
  })),
  getActiveDb: jest.fn(() => ({})),
  getActiveStorage: jest.fn(() => ({})),
  getActiveFunctions: jest.fn(() => ({})),
  currentActiveFirebaseEnv: 'development',
  reinitFirebaseForEnv: jest.fn(),
  auth: { currentUser: null },
};

jest.mock('@/firebase', () => mockFirebaseModule);
jest.mock('../firebase', () => mockFirebaseModule);


