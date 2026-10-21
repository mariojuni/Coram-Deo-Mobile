import { formatCurrency, getCurrencySymbol, getCurrencyCode } from '../currency';
import { useChurchStore } from '@/store/useChurchStore';

describe('currency utils', () => {
  beforeEach(() => {
    // Reset to USD standard config for predictable tests
    useChurchStore.setState({
      currency: {
        code: 'USD',
        symbol: '$',
        decimalPlaces: 2,
        position: 'prefix',
        locale: 'en-US',
      },
    } as any);
  });

  describe('formatCurrency', () => {
    it('formats a standard positive number with prefix symbol and 2 decimals', () => {
      const result = formatCurrency(1234.5);
      expect(result).toBe('$ 1,234.50');
    });

    it('formats negative values with leading minus sign', () => {
      const result = formatCurrency(-50);
      expect(result).toBe('-$ 50.00');
    });

    it('handles null, undefined, or empty values defaulting to 0', () => {
      expect(formatCurrency(null)).toBe('$ 0.00');
      expect(formatCurrency(undefined)).toBe('$ 0.00');
      expect(formatCurrency('')).toBe('$ 0.00');
    });

    it('supports compact notation for large numbers (k, M, B)', () => {
      expect(formatCurrency(1500, null, { compact: true })).toBe('$ 1.5k');
      expect(formatCurrency(2500000, null, { compact: true })).toBe('$ 2.5M');
      expect(formatCurrency(1000000000, null, { compact: true })).toBe('$ 1B');
    });

    it('respects showSymbol=false option', () => {
      const result = formatCurrency(100, null, { showSymbol: false });
      expect(result).toBe('100.00');
    });

    it('respects custom overrideConfig with suffix positioning', () => {
      const result = formatCurrency(250, {
        code: 'EUR',
        symbol: '€',
        position: 'suffix',
        locale: 'de-DE',
      });
      // In German locale 250 with 2 decimals is 250,00 €
      expect(result).toContain('250');
      expect(result).toContain('€');
      expect(result.endsWith('€')).toBe(true);
    });
  });

  describe('getCurrencySymbol and getCurrencyCode', () => {
    it('returns the current store symbol and code', () => {
      expect(getCurrencySymbol()).toBe('$');
      expect(getCurrencyCode()).toBe('USD');
    });

    it('returns overridden symbol and code when provided', () => {
      expect(getCurrencySymbol({ symbol: '₱' })).toBe('₱');
      expect(getCurrencyCode({ code: 'PHP' })).toBe('PHP');
    });
  });
});
