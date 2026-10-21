import { prayerRepository } from '../prayer.repository';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firestore from 'firebase/firestore';

// Mock Firebase helpers
jest.mock('../../../../firebase', () => ({
  getActiveDb: jest.fn(() => ({})),
}));

jest.mock('@/firebase', () => ({
  getActiveDb: jest.fn(() => ({})),
}));


describe('prayerRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore?.();
  });

  describe('Caching', () => {
    it('returns empty array if cache is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const prayers = await prayerRepository.getCachedPrayers('church-1');
      expect(prayers).toEqual([]);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@prayers_cache_church-1');
    });

    it('loads and parses cached prayers from AsyncStorage', async () => {
      const mockPrayers = [{ id: 'p1', name: 'Sister Mary', request: 'Healing' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockPrayers));

      const prayers = await prayerRepository.getCachedPrayers('church-1');
      expect(prayers).toEqual(mockPrayers);
    });

    it('saves prayers to AsyncStorage under church-scoped key', async () => {
      const mockPrayers: any = [{ id: 'p1', name: 'Brother Paul', request: 'Guidance' }];

      await prayerRepository.saveCachedPrayers('church-1', mockPrayers);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@prayers_cache_church-1',
        JSON.stringify(mockPrayers)
      );
    });
  });

  describe('togglePrayerAnswered', () => {
    it('updates document with answered: true and status: answered when previously false', async () => {
      (firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

      await prayerRepository.togglePrayerAnswered('church-1', 'prayer-1', false);

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { answered: true, status: 'answered' }
      );
    });

    it('updates document with answered: false and status: pending when previously true', async () => {
      (firestore.updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

      await prayerRepository.togglePrayerAnswered('church-1', 'prayer-1', true);

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { answered: false, status: 'pending' }
      );
    });
  });

  describe('addPrayer', () => {
    it('creates prayer document in Firestore and returns generated doc ID', async () => {
      (firestore.addDoc as jest.Mock).mockResolvedValueOnce({ id: 'generated-id-123' });

      const newId = await prayerRepository.addPrayer('church-1', {
        requestText: 'Comfort for family',
        requesterName: 'John',
        userId: 'user-77',
      });

      expect(newId).toBe('generated-id-123');
      expect(firestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          requestText: 'Comfort for family',
          requesterName: 'John',
          userId: 'user-77',
          likes: 0,
          answered: false,
        })
      );
    });
  });

  describe('submitPrayerRequest', () => {
    it('throws error if churchId is missing', async () => {
      await expect(
        prayerRepository.submitPrayerRequest({
          userId: 'u1',
          name: 'Jane',
          request: 'Wisdom',
        } as any)
      ).rejects.toThrow('churchId is required');
    });

    it('submits prayer request with full details', async () => {
      (firestore.addDoc as jest.Mock).mockResolvedValueOnce({ id: 'doc-456' });

      const id = await prayerRepository.submitPrayerRequest({
        churchId: 'church-1',
        userId: 'u1',
        name: 'Jane',
        title: 'Work Project',
        content: 'Pray for wisdom',
        category: 'work',
        visibility: 'church',
      } as any);

      expect(id).toBe('doc-456');
      expect(firestore.addDoc).toHaveBeenCalled();
    });
  });
});
