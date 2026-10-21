# Standard Mocking Guide for Expo & React Native

Central reference for mocking complex native modules and SDKs in unit and UI tests.

---

## 1. Expo Router (`expo-router`)

```typescript
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => ['(tabs)', 'home'],
  Link: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));
```

---

## 2. React Native Reanimated

In your `jest.setup.ts`:

```typescript
require('react-native-reanimated').setUpTests();
```

---

## 3. Lucide Icons (`lucide-react-native`)

To avoid SVG parsing issues and keep snapshots small:

```typescript
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        const IconMock = (props: any) =>
          React.createElement(View, { testID: `lucide-icon-${String(prop)}`, ...props });
        IconMock.displayName = `Lucide.${String(prop)}`;
        return IconMock;
      },
    }
  );
});
```

---

## 4. `@shopify/flash-list`

```typescript
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');

  return {
    FlashList: React.forwardRef(({ data, renderItem, ListEmptyComponent, ListHeaderComponent, ListFooterComponent }: any, ref: any) => {
      return React.createElement(
        ScrollView,
        { ref },
        ListHeaderComponent ? React.createElement(ListHeaderComponent) : null,
        data && data.length > 0
          ? data.map((item: any, index: number) =>
              React.createElement(React.Fragment, { key: index }, renderItem({ item, index }))
            )
          : ListEmptyComponent ? React.createElement(ListEmptyComponent) : null,
        ListFooterComponent ? React.createElement(ListFooterComponent) : null
      );
    }),
  };
});
```

---

## 5. React Native Firebase (`@react-native-firebase/*`)

```typescript
// Auth Mock
jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: { uid: 'test-user-123', email: 'test@example.com' },
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((callback) => {
    callback({ uid: 'test-user-123' });
    return () => {}; // unsubscribe
  }),
}));

// Firestore Mock
jest.mock('@react-native-firebase/firestore', () => {
  const mockCollection = jest.fn();
  return () => ({
    collection: mockCollection,
    batch: jest.fn(() => ({
      commit: jest.fn().mockResolvedValue(true),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  });
});
```

---

## 6. Async Storage & NetInfo

```typescript
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js')
);
```
