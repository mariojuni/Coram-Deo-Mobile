import React from 'react';
import { render, screen } from '@/test-utils/render';
import { VerseOfTheDayCard } from '../VerseOfTheDayCard';
import { useBibleVersionStore } from '@/store/useBibleVersionStore';

jest.mock('@/utils/bibleApi', () => ({
  fetchVerseOfTheDay: jest.fn(),
  getUserPreferences: jest.fn(),
  saveUserPreferences: jest.fn(),
}));

jest.mock('@/store/useBibleVersionStore', () => ({
  useBibleVersionStore: jest.fn(),
}));

describe('VerseOfTheDayCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders verse text with original font style (Lora, fontWeight 500) without leading verse number', async () => {
    const mockVotd = {
      html: '<div><div class="q1"><span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>Commit to the <span class="nd">Lord</span> whatever you do,</div><div class="q2">and he will establish your plans.</div></div>',
      reference: 'Proverbs 16:3',
      passageId: 'PRO.16.3',
    };

    (useBibleVersionStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        activeTranslation: '111',
        isLoaded: true,
        votdCache: {
          '111': mockVotd,
        },
        votdLoading: false,
        loadVotd: jest.fn(),
      };
      return selector(state);
    });

    await render(<VerseOfTheDayCard />);

    const verseElement = screen.getByText(
      'Commit to the Lord whatever you do, and he will establish your plans.'
    );
    expect(verseElement).toBeTruthy();

    const flatStyle = Array.isArray(verseElement.props.style)
      ? Object.assign({}, ...verseElement.props.style.filter(Boolean))
      : verseElement.props.style;

    // Verify original font style: fontWeight 500, fontFamily Lora
    expect(flatStyle?.fontWeight).toBe('500');
    expect(flatStyle?.fontFamily).toBe('Lora');
  });

  it('strips leading raw verse number even if not in a span', async () => {
    const mockVotd = {
      html: '<p>16 For God so loved the world that he gave his one and only Son</p>',
      reference: 'John 3:16',
      passageId: 'JHN.3.16',
    };

    (useBibleVersionStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        activeTranslation: '111',
        isLoaded: true,
        votdCache: {
          '111': mockVotd,
        },
        votdLoading: false,
        loadVotd: jest.fn(),
      };
      return selector(state);
    });

    await render(<VerseOfTheDayCard />);

    const verseElement = screen.getByText(
      'For God so loved the world that he gave his one and only Son'
    );
    expect(verseElement).toBeTruthy();

    const flatStyle = Array.isArray(verseElement.props.style)
      ? Object.assign({}, ...verseElement.props.style.filter(Boolean))
      : verseElement.props.style;

    expect(flatStyle?.fontWeight).toBe('500');
    expect(flatStyle?.fontFamily).toBe('Lora');
  });
});
