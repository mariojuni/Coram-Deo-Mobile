# UI Test Templates

Templates for writing component tests and full screen integration tests using `@testing-library/react-native`.

---

## 1. UI Component Test Template

Path: `src/features/<feature>/presentation/components/__tests__/<Component>.test.tsx`

```tsx
import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { EventCard } from '../EventCard';

describe('EventCard Component', () => {
  const defaultProps = {
    title: 'Sunday Worship Service',
    date: 'Sunday, Oct 25 • 10:00 AM',
    location: 'Main Sanctuary',
    isRegistered: false,
    onRegisterPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders event details correctly', async () => {
    await render(<EventCard {...defaultProps} />);

    expect(screen.getByText('Sunday Worship Service')).toBeTruthy();
    expect(screen.getByText('Sunday, Oct 25 • 10:00 AM')).toBeTruthy();
    expect(screen.getByText('Main Sanctuary')).toBeTruthy();
  });

  it('calls onRegisterPress callback when register button is pressed', async () => {
    const user = userEvent.setup();
    await render(<EventCard {...defaultProps} />);

    const registerButton = screen.getByRole('button', { name: /register/i });
    await user.press(registerButton);

    expect(defaultProps.onRegisterPress).toHaveBeenCalledTimes(1);
  });

  it('displays registered badge when isRegistered is true', async () => {
    await render(<EventCard {...defaultProps} isRegistered={true} />);

    expect(screen.getByText('Registered')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^register$/i })).toBeNull();
  });
});
```

---

## 2. Screen Integration Test Template (4 Mandatory States)

Path: `src/features/<feature>/presentation/screens/__tests__/<Screen>.test.tsx`

```tsx
import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { GivingScreen } from '../GivingScreen';
import * as givingHooks from '@/features/giving/presentation/hooks/useGivingData';

// Mock hook module
jest.mock('@/features/giving/presentation/hooks/useGivingData');

describe('GivingScreen Integration', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Loading State
  it('renders loading skeleton when fetching giving data', async () => {
    jest.spyOn(givingHooks, 'useGivingData').mockReturnValue({
      funds: [],
      recentGifts: [],
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as any);

    await render(<GivingScreen />);
    expect(screen.getByTestId('giving-skeleton-loader')).toBeTruthy();
  });

  // 2. Success State with Data
  it('renders giving funds and recent transactions when data is loaded', async () => {
    jest.spyOn(givingHooks, 'useGivingData').mockReturnValue({
      funds: [{ id: 'tithe', name: 'General Tithe & Offering' }],
      recentGifts: [{ id: 'g1', amount: 100, date: 'Oct 20, 2026' }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    await render(<GivingScreen />);
    expect(screen.getByText('General Tithe & Offering')).toBeTruthy();
    expect(screen.getByText('$100.00')).toBeTruthy();
  });

  // 3. Empty State
  it('renders friendly empty state when no recent gifts exist', async () => {
    jest.spyOn(givingHooks, 'useGivingData').mockReturnValue({
      funds: [{ id: 'tithe', name: 'General Tithe & Offering' }],
      recentGifts: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    await render(<GivingScreen />);
    expect(screen.getByText(/No recent giving history/i)).toBeTruthy();
  });

  // 4. Error State & Retry Flow
  it('renders error banner and allows user to trigger retry', async () => {
    const user = userEvent.setup();
    jest.spyOn(givingHooks, 'useGivingData').mockReturnValue({
      funds: [],
      recentGifts: [],
      isLoading: false,
      error: new Error('Failed to fetch gifts'),
      refetch: mockRefetch,
    } as any);

    await render(<GivingScreen />);
    expect(screen.getByText(/Failed to load giving options/i)).toBeTruthy();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.press(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
```
