import React from 'react';
import { render, screen, fireEvent } from '@/test-utils/render';
import MyJourneyCard from '../MyJourneyCard';
import { useMyJourney } from '@/features/myJourney/presentation/hooks/useMyJourney';
import { useRouter } from 'expo-router';

// Mock the useMyJourney hook
jest.mock('@/features/myJourney/presentation/hooks/useMyJourney', () => ({
  useMyJourney: jest.fn(),
}));

describe('MyJourneyCard Component', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders shimmer skeleton while loading', async () => {
    (useMyJourney as jest.Mock).mockReturnValue({
      loading: true,
      metrics: {
        readingDaysCount: 0,
        notesCreatedCount: 0,
        highlightsCreatedCount: 0,
        planDaysCompletedCount: 0,
        activityByDay: [false, false, false, false, false, false, false],
      },
    });

    await render(<MyJourneyCard />);

    // In loading state, title "My Journey" should not be rendered yet
    expect(screen.queryByText('My Journey')).toBeNull();
  });

  it('renders nothing when user has 0 activity across all metrics', async () => {
    (useMyJourney as jest.Mock).mockReturnValue({
      loading: false,
      metrics: {
        readingDaysCount: 0,
        notesCreatedCount: 0,
        highlightsCreatedCount: 0,
        planDaysCompletedCount: 0,
        activityByDay: [false, false, false, false, false, false, false],
      },
    });

    await render(<MyJourneyCard />);
    expect(screen.queryByText('My Journey')).toBeNull();
  });

  it('renders metrics and navigates to /my-journey when pressed', async () => {
    (useMyJourney as jest.Mock).mockReturnValue({
      loading: false,
      metrics: {
        readingDaysCount: 4,
        notesCreatedCount: 2,
        highlightsCreatedCount: 1,
        planDaysCompletedCount: 3,
        activityByDay: [false, true, true, false, true, true, false],
      },
    });

    await render(<MyJourneyCard />);

    expect(screen.getByText('My Journey')).toBeTruthy();
    expect(screen.getByText('4 days')).toBeTruthy();

    const titleElement = screen.getByText('My Journey');
    await fireEvent.press(titleElement);

    expect(mockPush).toHaveBeenCalledWith('/my-journey');
  });

  it('formats singular day text when readingDaysCount is 1', async () => {
    (useMyJourney as jest.Mock).mockReturnValue({
      loading: false,
      metrics: {
        readingDaysCount: 1,
        notesCreatedCount: 0,
        highlightsCreatedCount: 0,
        planDaysCompletedCount: 0,
        activityByDay: [false, false, false, true, false, false, false],
      },
    });

    await render(<MyJourneyCard />);

    expect(screen.getByText('1 day')).toBeTruthy();
  });
});
