import React from 'react';
import { render, screen } from '@/test-utils/render';
import { AppLogoSvg } from '../AnimatedSplashScreen';

describe('AppLogoSvg Component', () => {
  it('renders default SVG structure with size 140', async () => {
    await render(<AppLogoSvg />);

    expect(screen.getByTestId('Svg')).toBeTruthy();
    expect(screen.getByTestId('Defs')).toBeTruthy();
  });

  it('applies custom dimensions and scale props', async () => {
    await render(<AppLogoSvg size={200} dotScale={1.5} glowOpacity={0.8} />);

    expect(screen.getByTestId('Svg')).toBeTruthy();
  });
});
