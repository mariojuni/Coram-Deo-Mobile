# Unit Test Templates

Templates for writing unit tests across Domain, Data, Hooks, and Utility layers.

---

## 1. Pure Function & Utility Test Template

Path: `src/features/<feature>/utils/__tests__/<util-name>.test.ts`

```typescript
import { formatCurrency, parseScriptureReference } from '../scriptureHelper';

describe('scriptureHelper', () => {
  describe('parseScriptureReference', () => {
    it('correctly parses book, chapter, and verse range', () => {
      const result = parseScriptureReference('John 3:16-17');
      expect(result).toEqual({
        book: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: 17,
      });
    });

    it('returns null when given an invalid reference string', () => {
      const result = parseScriptureReference('InvalidBook 999:999');
      expect(result).toBeNull();
    });

    it('handles single-verse references gracefully', () => {
      const result = parseScriptureReference('Genesis 1:1');
      expect(result).toEqual({
        book: 'Genesis',
        chapter: 1,
        startVerse: 1,
        endVerse: 1,
      });
    });
  });
});
```

---

## 2. Repository / Data Layer Test Template

Path: `src/features/<feature>/data/__tests__/<feature>.repository.test.ts`

```typescript
import { PrayerRepository } from '../prayer.repository';
import { AppError } from '@/utils/error';

// Mock external dependency (e.g. Firebase Firestore)
const mockGet = jest.fn();
const mockCollection = jest.fn(() => ({
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  get: mockGet,
}));

jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: mockCollection,
}));

describe('PrayerRepository', () => {
  let repository: PrayerRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrayerRepository();
  });

  it('fetches and returns a list of prayers mapped to domain entities', async () => {
    const mockDocs = [
      {
        id: 'prayer-1',
        data: () => ({ title: 'Healing', authorId: 'u1', createdAt: 1700000000 }),
      },
    ];
    mockGet.mockResolvedValueOnce({ docs: mockDocs });

    const result = await repository.getPrayers('u1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'prayer-1',
        title: 'Healing',
      })
    );
  });

  it('maps native database errors to strong domain errors', async () => {
    mockGet.mockRejectedValueOnce(new Error('Permission denied'));

    await expect(repository.getPrayers('u1')).rejects.toThrow(AppError);
  });
});
```

---

## 3. Custom Hook & Zustand Store Test Template

Path: `src/features/<feature>/presentation/hooks/__tests__/use<Feature>Data.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useSermonPlayer } from '../useSermonPlayer';
import { useSermonStore } from '@/features/sermons/presentation/context/sermonStore';

const mockPlay = jest.fn();
const mockPause = jest.fn();

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    play: mockPlay,
    pause: mockPause,
    isPlaying: false,
  }),
}));

describe('useSermonPlayer', () => {
  beforeEach(() => {
    useSermonStore.setState({ currentSermon: null, isPlaying: false });
    jest.clearAllMocks();
  });

  it('initializes with default inactive state', () => {
    const { result } = renderHook(() => useSermonPlayer());
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentSermon).toBeNull();
  });

  it('triggers playback and updates store when loadAndPlay is called', async () => {
    const { result } = renderHook(() => useSermonPlayer());

    const mockSermon = { id: 's1', title: 'Grace Abounds', audioUrl: 'https://example.com/audio.mp3' };

    await act(async () => {
      await result.current.loadAndPlay(mockSermon);
    });

    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(useSermonStore.getState().currentSermon?.id).toBe('s1');
  });
});
```
