import React from 'react';
import { render, screen, fireEvent } from '@/test-utils/render';
import { CustomTabBar } from '../CustomTabBar';

describe('CustomTabBar UI Component', () => {
  const mockNavigate = jest.fn();
  const mockEmit = jest.fn().mockReturnValue({ defaultPrevented: false });

  const createDefaultProps = (selectedIndex = 0) => ({
    isStaff: false,
    tabBarProps: {
      navigation: {
        navigate: mockNavigate,
        emit: mockEmit,
      },
      state: {
        index: selectedIndex,
        routes: [
          { key: 'home-key', name: 'index' },
          { key: 'community-key', name: 'community' },
          { key: 'giving-key', name: 'giving' },
          { key: 'hidden-key', name: 'hidden-route' },
        ],
      },
      descriptors: {
        'home-key': {
          options: {
            tabBarAccessibilityLabel: 'Home Tab',
            tabBarTestID: 'tab-home',
          },
        },
        'community-key': {
          options: {
            tabBarAccessibilityLabel: 'Community Tab',
            tabBarTestID: 'tab-community',
          },
        },
        'giving-key': {
          options: {
            tabBarAccessibilityLabel: 'Giving Tab',
            tabBarTestID: 'tab-giving',
          },
        },
        'hidden-key': {
          options: {
            href: null, // Hidden tab route
            tabBarAccessibilityLabel: 'Hidden Tab',
            tabBarTestID: 'tab-hidden',
          },
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders visible tabs and ignores hidden routes where href is null', async () => {
    const props = createDefaultProps();
    await render(<CustomTabBar {...props} />);

    expect(screen.getByTestId('tab-home')).toBeTruthy();
    expect(screen.getByTestId('tab-community')).toBeTruthy();
    expect(screen.getByTestId('tab-giving')).toBeTruthy();
    expect(screen.queryByTestId('tab-hidden')).toBeNull();
  });

  it('marks active tab with selected accessibility state', async () => {
    const props = createDefaultProps(1); // community selected
    await render(<CustomTabBar {...props} />);

    const communityTab = screen.getByTestId('tab-community');
    expect(communityTab.props.accessibilityState).toEqual({ selected: true });

    const homeTab = screen.getByTestId('tab-home');
    expect(homeTab.props.accessibilityState).toEqual({});
  });

  it('emits tabPress and navigates to route when unselected tab is pressed', async () => {
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb: any) => {
      cb();
      return 0;
    });

    const props = createDefaultProps(0); // home selected
    await render(<CustomTabBar {...props} />);

    const givingTab = screen.getByTestId('tab-giving');
    await fireEvent.press(givingTab);

    expect(mockEmit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'giving-key',
      canPreventDefault: true,
    });
    expect(mockNavigate).toHaveBeenCalledWith('giving');
  });
});
