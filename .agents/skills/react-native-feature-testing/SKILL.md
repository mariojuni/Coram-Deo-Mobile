---
name: react-native-feature-testing
description: >-
  Expert guide for writing robust unit tests and UI component/integration tests
  for React Native and Expo features. Use whenever designing, creating, or
  refactoring unit tests (data, domain, hooks, stores, utilities) and UI tests
  (components, screens, user interactions) across features in the project.
---

# React Native & Expo Feature Testing Skill

This skill provides Senior React / React Native engineering standards and repeatable patterns for authoring unit and UI tests across all project features. It aligns with Clean Feature Architecture, Expo (v56/v57), React 19, React Native 0.86+, Zustand, and React Native Testing Library (RNTL).

---

## 1. Feature Architecture & Test Boundaries

Every feature in `src/features/<feature_name>` follows a clean layered architecture. Test each layer with the appropriate test type and isolation boundary:

```text
src/features/<feature_name>/
├── domain/                    --> UNIT TEST: Pure models, validators, business rules, error mappings
├── data/                      --> UNIT TEST: Repositories & data sources (Mock external SDKs: Firebase, SQLite, NetInfo)
├── presentation/
│   ├── hooks/                 --> UNIT/HOOK TEST: State transitions, caching, side-effects, Zustand integration
│   ├── components/            --> UI COMPONENT TEST: Isolated component rendering, props, callbacks, accessibility
│   └── screens/               --> UI INTEGRATION TEST: Full screen rendering, loading/empty/error states, user flows
└── utils/                     --> UNIT TEST: Pure utility functions, formatters, transpositions, calculations
```

### Test Strategy Matrix

| Layer | Primary Test Focus | Tools | Mocks Required |
| :--- | :--- | :--- | :--- |
| **Domain & Utils** | Pure logic, edge cases, boundaries, zero side effects | Jest (`describe`, `it`, `expect`) | None (pure functions) |
| **Data (Repositories)** | API/Database abstraction, query mapping, error wrapping | Jest + Spies/Mocks | Firebase, SQLite, AsyncStorage, NetInfo |
| **Hooks & Stores** | State changes, selector updates, async lifecycles | `renderHook`, `act` | Repositories, native storage, timers |
| **UI Components** | Visual presence, conditional branches, accessibility, events | RNTL (`render`, `screen`, `userEvent`) | Native animations, UI icons |
| **Screens** | Screen composition, loading -> data -> error flows | RNTL (`render`, `waitFor`, `userEvent`) | Expo Router, navigation, hooks/repositories |

---

## 2. Directory Structure & Naming Conventions

Always colocate tests inside a `__tests__` folder inside each feature sublayer:

```text
src/features/<feature>/
├── data/
│   ├── __tests__/
│   │   └── <feature>.repository.test.ts
│   └── <feature>.repository.ts
├── domain/
│   ├── __tests__/
│   │   └── <feature>.validator.test.ts
│   └── <feature>.validator.ts
├── presentation/
│   ├── components/
│   │   ├── __tests__/
│   │   │   └── FeatureCard.test.tsx
│   │   └── FeatureCard.tsx
│   ├── hooks/
│   │   ├── __tests__/
│   │   │   └── useFeatureData.test.ts
│   │   └── useFeatureData.ts
│   └── screens/
│       ├── __tests__/
│       │   └── FeatureScreen.test.tsx
│       └── FeatureScreen.tsx
└── utils/
    ├── __tests__/
    │   └── featureHelper.test.ts
    └── featureHelper.ts
```

### Naming Rules
- Unit test files: `<name>.test.ts`
- UI / Component test files: `<ComponentName>.test.tsx`
- Screen test files: `<ScreenName>.test.tsx`
- Mock files / test doubles: `src/test-utils/mocks/` or colocated `__mocks__/`

---

## 3. Unit Testing Guidelines

### A. Pure Utilities & Domain Logic
- Test normal paths, null/undefined inputs, empty arrays, extreme bounds, and invalid formats.
- Aim for 100% branch coverage on domain rules and math/formatters.
- Example: See [references/unit-test-templates.md](./references/unit-test-templates.md).

### B. Data Layer & Repositories
- Never make real network calls or write to live Firebase/SQLite in unit tests.
- Mock external SDKs via `jest.mock()` or inject mock clients/data-sources.
- Always test:
  1. Successful data fetching and correct entity deserialization.
  2. Empty result handling.
  3. Network / SDK exceptions mapped to strongly typed domain errors (e.g. `AppAuthError`).

### C. Custom Hooks & Zustand Stores
- Use `renderHook` from `@testing-library/react-native`.
- Wrap state changes inside `act(() => { ... })` when testing synchronous updates or async state resolutions.
- For Zustand stores: reset the store state in `beforeEach` to avoid cross-test contamination:
  ```typescript
  beforeEach(() => {
    useFeatureStore.setState(initialState, true);
    jest.clearAllMocks();
  });
  ```

---

## 4. UI Testing Guidelines (RNTL)

### A. Testing Library Philosophy: Test User Behavior, Not Implementation
1. **Never test internal component state directly**. Test what the user sees and interacts with.
2. **Prioritize Accessible Queries**:
   - Preferred: `screen.getByRole('button', { name: /submit/i })`
   - Preferred: `screen.getByText('Welcome Back')`
   - Preferred: `screen.getByPlaceholderText('Enter your email')`
   - Secondary: `screen.getByLabelText('Password input')`
   - Last resort: `screen.getByTestId('custom-view-id')` (use only for generic containers or unlabelled custom surfaces).

### B. User Interactions
- Use `@testing-library/react-native`'s `userEvent` for realistic event propagation (typing, pressing).
- Fallback to `fireEvent.press()` for specific gesture handler callbacks when required.

### C. The 4 Mandatory Screen States
Every screen feature UI test suite MUST cover:
1. **Loading State**: Displays skeleton / activity indicator when data is fetching.
2. **Success State with Data**: Displays list items, cards, headers, and dynamic values.
3. **Empty State**: Displays friendly illustration/text when query returns 0 items.
4. **Error State**: Displays error message and retry button when query fails.

### D. React 19 / RNTL v14 Async Rendering Rule
In React 19 and `@testing-library/react-native` v14+, `render()` and event dispatches are asynchronous.
- Always use `await render(<Component />)` instead of synchronous `render(...)`.
- Always `await fireEvent.press(...)` or `await user.press(...)`.
- Spying on `Date.now()` is preferred over fake timers for timestamp-based debounce checks to prevent fake timer interference with React 19 async transitions.

---

## 5. Standard Native & Expo Mocking Harness

Always ensure native modules are cleanly mocked to prevent React Native runtime crashes in Node environment:

- **Expo Router**: Mock `useRouter()`, `useLocalSearchParams()`, `useSegments()`, `<Link />`.
- **React Native Reanimated**: Use standard Reanimated mock (`require('react-native-reanimated/mock')`).
- **Icons (`lucide-react-native`)**: Mock as simple functional components to avoid SVG parsing overhead.
- **Expo Audio / Video**: Mock playback controls (`playAsync`, `pauseAsync`, `loadAsync`).
- **Safe Area Context**: Return standard insets `{ top: 0, bottom: 0, left: 0, right: 0 }`.

Refer to [references/mocking-guide.md](./references/mocking-guide.md) for pre-built mock snippets.

---

## 6. Pre-flight Test Execution Checklist

Before finishing any feature test implementation:
1. **Run Single Test**: `npm test -- <path_to_test_file>`
2. **Verify Isolation**: Ensure tests pass with `--runInBand` or random execution order.
3. **No Unhandled Async**: Ensure all promises and timers are flushed (`await waitFor(...)`, `jest.runAllTimers()`).
4. **No Console Warnings**: Silence or fix act warnings (`Warning: An update to Component inside a test was not wrapped in act(...)`).
5. **Clean Assertions**: Each test must have meaningful assertions (`expect(...)`), avoiding superficial "renders without crashing" assertions alone.
