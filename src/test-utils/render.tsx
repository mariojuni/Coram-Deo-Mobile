import React, { ReactElement } from 'react';
import { render as originalRender, RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {children}
    </SafeAreaProvider>
  );
};

export const render = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return originalRender(ui, { wrapper: AllTheProviders, ...options });
};

export const renderWithProviders = render;

export * from '@testing-library/react-native';
