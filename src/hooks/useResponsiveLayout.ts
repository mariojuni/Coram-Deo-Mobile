import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type DeviceCategory = 'compact' | 'medium' | 'expanded';
export type ModalPresentation = 'bottomSheet' | 'formSheet';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = width > height;
  const smallestDimension = Math.min(width, height);

  // Tablet hardware / form-factor detection
  const isTablet =
    (Platform.OS === 'ios' && Platform.isPad) ||
    smallestDimension >= 600 ||
    width >= 768;

  // Window-width based breakpoints (handles Split View / Stage Manager resizing gracefully)
  const isCompact = width < 600;
  const isMedium = width >= 600 && width < 840;
  const isExpanded = width >= 840;

  const deviceCategory: DeviceCategory = isExpanded
    ? 'expanded'
    : isMedium
    ? 'medium'
    : 'compact';

  // Backwards compatibility flags
  const isSmallDevice = width < 375;
  const isTabletOrDesktop = isTablet || width >= 768;
  const isLandscapeOrFlexFold = height < 550;
  const isFoldableWide = width >= 600;

  // Adaptive horizontal gutter
  const horizontalPadding = isExpanded
    ? 32
    : isMedium
    ? 24
    : isSmallDevice
    ? 14
    : 20;

  // Reading measure (optimal 55-75 chars per line for scripture, notes, text)
  const maxReadingWidth = Math.min(width - horizontalPadding * 2, 680);

  // Maximum content width for general views
  const maxContentWidth = isExpanded ? 1040 : isMedium ? 720 : Math.min(width, 680);

  // Dashboard max width for multi-column grids
  const maxDashboardWidth = Math.min(width - horizontalPadding * 2, 1080);

  // Form & modal max width
  const maxFormWidth = Math.min(width - 48, 480);
  const maxModalWidth = Math.min(width - 48, 560);
  const modalPresentation: ModalPresentation = isTablet || width >= 600 ? 'formSheet' : 'bottomSheet';

  // Responsive Grid Columns
  const gridColumns = width >= 1024 ? 3 : width >= 600 ? 2 : 1;
  const dashboardColumns = width >= 768 ? 2 : 1;

  // Proportional card width for horizontal lists
  const birthdayCardWidth = isTabletOrDesktop
    ? 220
    : isSmallDevice
    ? Math.max(145, (width - horizontalPadding * 2 - 10) * 0.58)
    : Math.max(165, Math.min(220, (width - horizontalPadding * 2 - 10) * 0.52));

  // Dynamic vertical item spacing
  const verticalItemSpacing = isLandscapeOrFlexFold ? 8 : 12;

  // Bottom clearance for floating tab bar
  const floatingTabBarHeight = 64;
  const bottomBarOffset = Math.max(insets.bottom, 16);
  const scrollBottomInset = floatingTabBarHeight + bottomBarOffset + 28;

  return {
    width,
    height,
    insets,
    isLandscape,
    isTablet,
    isCompact,
    isMedium,
    isExpanded,
    deviceCategory,
    isSmallDevice,
    isTabletOrDesktop,
    isLandscapeOrFlexFold,
    isFoldableWide,
    horizontalPadding,
    verticalItemSpacing,
    maxContentWidth,
    maxReadingWidth,
    maxDashboardWidth,
    maxFormWidth,
    maxModalWidth,
    modalPresentation,
    gridColumns,
    dashboardColumns,
    birthdayCardWidth,
    scrollBottomInset,
  };
}
