import { renderHook, act } from '@testing-library/react-native';
import { useHomeScreenData } from '../useHomeScreenData';
import { useAuthStore } from '@/store/useAuthStore';
import { useScheduleStore, updateRsvp } from '@/store/useScheduleStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';
import { prayerRepository } from '@/features/prayer/data/prayer.repository';
import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import { NotificationRepository } from '@/services/notification/NotificationRepository';

// Mock dependencies
jest.mock('@/store/useAuthStore');
jest.mock('@/store/useScheduleStore', () => {
  const actual = jest.requireActual('@/store/useScheduleStore');
  return {
    ...actual,
    useScheduleStore: jest.fn(),
    updateRsvp: jest.fn().mockResolvedValue(undefined),
  };
});
jest.mock('@/store/useMinistryStore');
jest.mock('@/store/useBiblePlanStore');
jest.mock('@/features/prayer/data/prayer.repository', () => ({
  prayerRepository: {
    subscribeToLatestPrayer: jest.fn(() => () => {}),
    togglePrayerLike: jest.fn().mockResolvedValue(undefined),
    togglePrayerAnswered: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/features/ministry/data/ministry.repository', () => ({
  ministryRepository: {
    updateAssignment: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/services/notification/NotificationRepository', () => ({
  NotificationRepository: {
    deleteNotificationBySourceId: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('useHomeScreenData Hook', () => {
  const mockInitializeSchedulesListener = jest.fn(() => () => {});
  const mockInitializeAssignmentsListener = jest.fn(() => () => {});
  const mockFetchMinistries = jest.fn();
  const mockInitializePlansListener = jest.fn(() => () => {});
  const mockInitializeUserBiblePlansListener = jest.fn(() => () => {});

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        currentUser: { uid: 'user_1', displayName: 'John Doe' },
        userProfile: { firstName: 'John', lastName: 'Doe', churchId: 'church_123', memberId: 'member_99' },
      })
    );

    (useScheduleStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        schedules: [
          { id: 'sched_1', status: 'published', date: '2026-10-21', time: '10:00 AM' },
          { id: 'sched_2', status: 'draft', date: '2026-10-22', time: '11:00 AM' }, // Ignored (draft)
          { id: 'sched_3', status: 'published', date: '2026-10-25', time: '02:00 PM' },
        ],
        initializeSchedulesListener: mockInitializeSchedulesListener,
      })
    );

    (useMinistryStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        assignments: [],
        initializeAssignmentsListener: mockInitializeAssignmentsListener,
        fetchMinistries: mockFetchMinistries,
      })
    );

    (useBiblePlanStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        initializePlansListener: mockInitializePlansListener,
        initializeUserBiblePlansListener: mockInitializeUserBiblePlansListener,
      })
    );
  });

  it('initializes data listeners on mount with churchId', async () => {
    await renderHook(() => useHomeScreenData());

    expect(mockInitializeSchedulesListener).toHaveBeenCalled();
    expect(mockFetchMinistries).toHaveBeenCalledWith('church_123');
    expect(mockInitializeAssignmentsListener).toHaveBeenCalledWith('church_123');
    expect(prayerRepository.subscribeToLatestPrayer).toHaveBeenCalledWith(
      'church_123',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('extracts user displayName correctly', async () => {
    const { result } = await renderHook(() => useHomeScreenData());
    expect(result.current.displayName).toBe('John');
  });

  it('falls back to Guest when no names are present', async () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        currentUser: null,
        userProfile: null,
      })
    );

    const { result } = await renderHook(() => useHomeScreenData());
    expect(result.current.displayName).toBe('Guest');
  });

  it('delegates handleRsvp to updateRsvp with current user id', async () => {
    const { result } = await renderHook(() => useHomeScreenData());

    await act(async () => {
      await result.current.handleRsvp('sched_1', 'Going');
    });

    expect(updateRsvp).toHaveBeenCalledWith('sched_1', 'user_1', 'Going');
  });

  it('delegates handlePray to prayerRepository.togglePrayerLike', async () => {
    const { result } = await renderHook(() => useHomeScreenData());

    await act(async () => {
      await result.current.handlePray('prayer_123');
    });

    expect(prayerRepository.togglePrayerLike).toHaveBeenCalledWith(
      'church_123',
      'prayer_123',
      'user_1'
    );
  });

  it('handles ministerial duty acceptance and cancellation', async () => {
    const { result } = await renderHook(() => useHomeScreenData());

    await act(async () => {
      await result.current.handleMinisterialDuty('assign_1', 'accept');
    });

    expect(ministryRepository.updateAssignment).toHaveBeenCalledWith('assign_1', {
      status: 'Confirmed',
    });
    expect(NotificationRepository.deleteNotificationBySourceId).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleMinisterialDuty('assign_1', 'cancel');
    });

    expect(ministryRepository.updateAssignment).toHaveBeenCalledWith('assign_1', {
      status: 'Declined',
    });
    expect(NotificationRepository.deleteNotificationBySourceId).toHaveBeenCalledWith(
      'user_1',
      'assign_1'
    );
  });

  it('supports error clearing and retrying', async () => {
    const { result } = await renderHook(() => useHomeScreenData());

    expect(result.current.hasError).toBe(false);

    await act(async () => {
      result.current.retry();
    });

    expect(result.current.hasError).toBe(false);
  });
});
