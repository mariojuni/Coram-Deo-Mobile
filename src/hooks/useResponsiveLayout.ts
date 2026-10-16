import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Screen categories
  const isSmallDevice = width < 375;             // iPhone SE, small Android (<= 360dp)
  const isTabletOrDesktop = width >= 768;        // iPads, large foldables, desktop
  const isLandscapeOrFlexFold = height < 550;    // Flex mode / tabletop / landscape mode
  const isFoldableWide = width >= 600;           // Unfolded Fold or tablet

  // Adaptive horizontal gutter
  const horizontalPadding = isTabletOrDesktop
    ? 28
    : isFoldableWide
    ? 24
    : isSmallDevice
    ? 14
    : 20;

  // Max readable content width (keeps cards elegant and centered on wide screens/tablets)
  const maxContentWidth = Math.min(width, 680);

  // Proportional card width for horizontal lists (e.g., Birthday snapshot)
  // Ensures ~1.8 to 2.1 cards are visible so the user immediately perceives it as scrollable
  const birthdayCardWidth = isTabletOrDesktop
    ? 220
    : isSmallDevice
    ? Math.max(145, (width - horizontalPadding * 2 - 10) * 0.58)
    : Math.max(165, Math.min(220, (width - horizontalPadding * 2 - 10) * 0.52));

  // Dynamic vertical item spacing (e.g. when in half-fold/flex mode, compact the items)
  const verticalItemSpacing = isLandscapeOrFlexFold ? 8 : 12;

  // Exact bottom clearance calculation
  // Floating Tab Bar height (~64) + bottom floating offset (Math.max(insets.bottom, 16)) + safety buffer (28)
  const floatingTabBarHeight = 64;
  const bottomBarOffset = Math.max(insets.bottom, 16);
  const scrollBottomInset = floatingTabBarHeight + bottomBarOffset + 28;

  return {
    width,
    height,
    insets,
    isSmallDevice,
    isTabletOrDesktop,
    isLandscapeOrFlexFold,
    isFoldableWide,
    horizontalPadding,
    verticalItemSpacing,
    maxContentWidth,
    birthdayCardWidth,
    scrollBottomInset,
  };
}
