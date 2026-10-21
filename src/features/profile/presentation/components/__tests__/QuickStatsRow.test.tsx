import React from 'react';
import { render, screen, fireEvent } from '@/test-utils/render';
import { QuickStatsRow } from '../QuickStatsRow';

describe('QuickStatsRow Component', () => {
  const mockStats = {
    highlightsCount: 12,
    notesCount: 5,
    plansCount: 2,
    groupsCount: 3,
    ministriesCount: 1,
  };

  it('renders section title and all 5 statistics with correct values', async () => {
    await render(<QuickStatsRow stats={mockStats} />);

    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Highlights')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();

    expect(screen.getByText('Notes')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();

    expect(screen.getByText('Plans')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();

    expect(screen.getByText('Groups')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    expect(screen.getByText('Ministries')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('fires onStatPress callback with the selected key when tapped', async () => {
    const handleStatPress = jest.fn();
    await render(<QuickStatsRow stats={mockStats} onStatPress={handleStatPress} />);

    const highlightsButton = screen.getByText('Highlights');
    await fireEvent.press(highlightsButton);
    expect(handleStatPress).toHaveBeenCalledWith('highlights');

    const notesButton = screen.getByText('Notes');
    await fireEvent.press(notesButton);
    expect(handleStatPress).toHaveBeenCalledWith('notes');
  });

  it('does not throw when tapped without onStatPress provided', async () => {
    await render(<QuickStatsRow stats={mockStats} />);
    const plansButton = screen.getByText('Plans');

    await expect(fireEvent.press(plansButton)).resolves.not.toThrow();
  });
});
