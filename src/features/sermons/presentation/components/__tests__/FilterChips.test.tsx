import React from 'react';
import { render, screen, fireEvent } from '@/test-utils/render';
import { FilterChips } from '../FilterChips';
import * as Haptics from 'expo-haptics';

describe('FilterChips Component', () => {
  const defaultProps = {
    activeFilter: 'all' as const,
    onFilterChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 4 filter labels correctly', async () => {
    await render(<FilterChips {...defaultProps} />);

    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Video')).toBeTruthy();
    expect(screen.getByText('Audio')).toBeTruthy();
    expect(screen.getByText('Series')).toBeTruthy();
  });

  it('calls onFilterChange with selected filter and triggers haptics when pressed', async () => {
    await render(<FilterChips {...defaultProps} />);

    const videoChip = screen.getByText('Video');
    await fireEvent.press(videoChip);

    expect(defaultProps.onFilterChange).toHaveBeenCalledWith('video');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('triggers onFilterChange when switching to audio filter', async () => {
    await render(<FilterChips {...defaultProps} activeFilter="video" />);

    const audioChip = screen.getByText('Audio');
    await fireEvent.press(audioChip);

    expect(defaultProps.onFilterChange).toHaveBeenCalledWith('audio');
  });
});
