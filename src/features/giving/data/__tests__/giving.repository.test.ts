import {
  fetchActiveCampaigns,
  fetchGivingFunds,
  fetchDonationAccounts,
} from '../giving.repository';
import * as firestore from 'firebase/firestore';

describe('giving repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore?.();
  });

  describe('fetchActiveCampaigns', () => {
    it('returns empty array when churchId is falsy', async () => {
      const result = await fetchActiveCampaigns('');
      expect(result).toEqual([]);
    });

    it('filters out archived, completed, and draft campaigns', async () => {
      const mockDocs = [
        { id: 'c1', data: () => ({ name: 'Building Fund', status: 'active' }) },
        { id: 'c2', data: () => ({ name: 'Old Campaign', status: 'archived' }) },
        { id: 'c3', data: () => ({ name: 'Youth Camp', status: 'draft' }) },
        { id: 'c4', data: () => ({ name: 'Missions 2026', status: 'ongoing' }) },
      ];

      (firestore.getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs });

      const campaigns = await fetchActiveCampaigns('church-1');

      expect(campaigns).toHaveLength(2);
      expect(campaigns.map(c => c.id)).toEqual(['c1', 'c4']);
    });

    it('catches and logs warning on database failure, returning empty list', async () => {
      (firestore.getDocs as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));

      const result = await fetchActiveCampaigns('church-1');
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        'Error fetching campaigns:',
        expect.any(Error)
      );
    });
  });

  describe('fetchGivingFunds', () => {
    it('returns empty array when churchId is empty', async () => {
      const result = await fetchGivingFunds('');
      expect(result).toEqual([]);
    });

    it('returns only active, non-archived funds', async () => {
      const mockDocs = [
        { id: 'f1', data: () => ({ name: 'Tithe', isActive: true, status: 'active' }) },
        { id: 'f2', data: () => ({ name: 'Special Offering', isActive: false, status: 'active' }) },
        { id: 'f3', data: () => ({ name: 'Discontinued Fund', isActive: true, status: 'archived' }) },
      ];

      (firestore.getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs });

      const funds = await fetchGivingFunds('church-1');

      expect(funds).toHaveLength(1);
      expect(funds[0].id).toBe('f1');
      expect(funds[0].name).toBe('Tithe');
    });
  });

  describe('fetchDonationAccounts', () => {
    it('returns accounts sorted with isPrimary first, then by displayOrder', async () => {
      const mockDocs = [
        { id: 'acc1', data: () => ({ name: 'Secondary Bank', isPrimary: false, displayOrder: 1 }) },
        { id: 'acc2', data: () => ({ name: 'GCash', isPrimary: false, displayOrder: 0 }) },
        { id: 'acc3', data: () => ({ name: 'Main BDO', isPrimary: true, displayOrder: 5 }) },
      ];

      (firestore.getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs });

      const accounts = await fetchDonationAccounts('church-1');

      expect(accounts).toHaveLength(3);
      // Primary should be first, regardless of displayOrder
      expect(accounts[0].id).toBe('acc3');
      // Then non-primary ordered by displayOrder: acc2 (0), then acc1 (1)
      expect(accounts[1].id).toBe('acc2');
      expect(accounts[2].id).toBe('acc1');
    });
  });
});
