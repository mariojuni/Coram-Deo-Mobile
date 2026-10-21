import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@/test-utils/render';
import DebouncedTouchable from '../DebouncedTouchable';

describe('DebouncedTouchable UI Component', () => {
  it('renders child content with button accessibility role', async () => {
    await render(
      <DebouncedTouchable accessibilityLabel="Confirm Action">
        <Text>Confirm</Text>
      </DebouncedTouchable>
    );

    const button = screen.getByRole('button', { name: /Confirm Action/i });
    expect(button).toBeTruthy();
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  it('triggers onPress on single tap', async () => {
    const onPressMock = jest.fn();
    await render(
      <DebouncedTouchable onPress={onPressMock}>
        <Text>Press Me</Text>
      </DebouncedTouchable>
    );

    const button = screen.getByRole('button');
    await fireEvent.press(button);

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('ignores rapid double-taps within debounce window (400ms default)', async () => {
    const onPressMock = jest.fn();
    await render(
      <DebouncedTouchable onPress={onPressMock}>
        <Text>Double Tap Test</Text>
      </DebouncedTouchable>
    );

    const button = screen.getByRole('button');
    const dateNowSpy = jest.spyOn(Date, 'now');

    // First press at t=1000
    dateNowSpy.mockReturnValue(1000);
    await fireEvent.press(button);
    expect(onPressMock).toHaveBeenCalledTimes(1);

    // Rapid second press at t=1100 (100ms later, within 400ms window)
    dateNowSpy.mockReturnValue(1100);
    await fireEvent.press(button);
    expect(onPressMock).toHaveBeenCalledTimes(1); // Ignored

    // Valid press at t=1500 (500ms later, after debounce window has elapsed)
    dateNowSpy.mockReturnValue(1500);
    await fireEvent.press(button);
    expect(onPressMock).toHaveBeenCalledTimes(2); // Accepted

    dateNowSpy.mockRestore();
  });
});
