/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const BrandColors = {
  deepNavy: '#1E2A38',
  warmGold: '#D4A24C',
  warmGoldAccessible: '#A67C33', // Darkened for better contrast on light backgrounds (if needed)
  softBeige: '#F6F2EA',
  oliveGreen: '#5E8B5A',
  oliveGreenAccessible: '#3A6038', // Darkened to meet 4.5:1 on soft beige/white
  white: '#FFFFFF',
  error: '#B00020',
};

export const Colors = {
  light: {
    text: BrandColors.deepNavy,
    background: BrandColors.softBeige,
    backgroundElement: BrandColors.white,
    backgroundSelected: '#E0E1E6',
    textSecondary: BrandColors.oliveGreenAccessible,
    primary: BrandColors.deepNavy,
    accent: BrandColors.warmGold,
    error: BrandColors.error,
  },
  dark: {
    text: BrandColors.softBeige,
    background: BrandColors.deepNavy,
    backgroundElement: '#2C3A4A',
    backgroundSelected: '#3D4C5C',
    textSecondary: BrandColors.warmGold,
    primary: BrandColors.softBeige,
    accent: BrandColors.warmGold,
    error: BrandColors.error,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
