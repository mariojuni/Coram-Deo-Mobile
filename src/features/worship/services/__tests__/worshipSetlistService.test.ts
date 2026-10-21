import { worshipSetlistService } from '../worshipSetlistService';
import * as firestore from 'firebase/firestore';
import { canViewMobileWorshipSetlist } from '@/permissions/mobileWorshipPermissions';

jest.mock('@/permissions/mobileWorshipPermissions', () => ({
  canViewMobileWorshipSetlist: jest.fn(),
}));

describe('worshipSetlistService', () => {
  const mockGetDocs = firestore.getDocs as jest.Mock;
  const mockGetDoc = firestore.getDoc as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUpcomingWorshipSetlistsForUser', () => {
    it('returns empty array when user or churchId is missing', async () => {
      expect(await worshipSetlistService.getUpcomingWorshipSetlistsForUser(null)).toEqual([]);
      expect(await worshipSetlistService.getUpcomingWorshipSetlistsForUser({} as any)).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('fetches setlists, filters by user permissions, and sorts by serviceDate descending', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'setlist_1',
            data: () => ({ churchId: 'church_1', serviceDate: '2026-10-18', name: 'Service 1' }),
          },
          {
            id: 'setlist_2',
            data: () => ({ churchId: 'church_1', serviceDate: '2026-10-25', name: 'Service 2' }),
          },
          {
            id: 'setlist_3',
            data: () => ({ churchId: 'church_1', serviceDate: '2026-10-11', name: 'Service 3 (Forbidden)' }),
          },
        ],
      });

      // Allow setlist_1 and setlist_2, reject setlist_3
      (canViewMobileWorshipSetlist as jest.Mock).mockImplementation((_user, setlist) => {
        return setlist.id !== 'setlist_3';
      });

      const user = { uid: 'u1', churchId: 'church_1' } as any;
      const result = await worshipSetlistService.getUpcomingWorshipSetlistsForUser(user);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('setlist_2'); // 2026-10-25 (newer) comes before 2026-10-18
      expect(result[1].id).toBe('setlist_1');
    });
  });

  describe('getWorshipSetlistById', () => {
    it('returns null if churchId or setlistId is empty', async () => {
      expect(await worshipSetlistService.getWorshipSetlistById('', 'setlist_1')).toBeNull();
      expect(await worshipSetlistService.getWorshipSetlistById('church_1', '')).toBeNull();
    });

    it('returns null when setlist document does not exist or churchId does not match', async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });
      expect(await worshipSetlistService.getWorshipSetlistById('church_1', 'nonexistent')).toBeNull();

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'setlist_wrong_church',
        data: () => ({ churchId: 'different_church' }),
      });
      expect(await worshipSetlistService.getWorshipSetlistById('church_1', 'setlist_wrong_church')).toBeNull();
    });

    it('returns setlist when found and matches churchId', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'setlist_1',
        data: () => ({ churchId: 'church_1', title: 'Sunday Worship' }),
      });

      const setlist = await worshipSetlistService.getWorshipSetlistById('church_1', 'setlist_1');
      expect(setlist).toEqual({
        id: 'setlist_1',
        churchId: 'church_1',
        title: 'Sunday Worship',
      });
    });
  });

  describe('getWorshipSetlistItems', () => {
    it('returns empty array if churchId or setlistId is missing', async () => {
      expect(await worshipSetlistService.getWorshipSetlistItems('', 'setlist_1')).toEqual([]);
      expect(await worshipSetlistService.getWorshipSetlistItems('church_1', '')).toEqual([]);
    });

    it('fetches items and enriches with song documents', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'item_1',
            data: () => ({ setlistId: 'setlist_1', songId: 'song_1', order: 1 }),
          },
        ],
      });

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'song_1',
        data: () => ({ title: 'Way Maker', artist: 'Sinach' }),
      });

      const items = await worshipSetlistService.getWorshipSetlistItems('church_1', 'setlist_1');

      expect(items).toHaveLength(1);
      expect(items[0].song).toEqual({
        id: 'song_1',
        title: 'Way Maker',
        artist: 'Sinach',
      });
    });
  });
});
