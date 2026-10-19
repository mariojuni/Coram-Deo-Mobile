/**
 * Currency configuration and preset matrix for mobile app.
 */

export interface ChurchCurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  position: 'prefix' | 'suffix';
  decimalPlaces: number;
  locale: string;
}

export const DEFAULT_CURRENCY_CONFIG: ChurchCurrencyConfig = {
  code: 'PHP',
  symbol: '₱',
  name: 'Philippine Peso',
  position: 'prefix',
  decimalPlaces: 2,
  locale: 'en-PH',
};

export const POPULAR_CURRENCIES: ChurchCurrencyConfig[] = [
  {
    code: 'PHP',
    symbol: '₱',
    name: 'Philippine Peso',
    position: 'prefix',
    decimalPlaces: 2,
    locale: 'en-PH',
  },
  {
    code: 'AED',
    symbol: 'AED',
    name: 'United Arab Emirates Dirham',
    position: 'prefix',
    decimalPlaces: 2,
    locale: 'en-AE',
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    position: 'prefix',
    decimalPlaces: 2,
    locale: 'en-US',
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    position: 'prefix',
    decimalPlaces: 2,
    locale: 'en-CA',
  },
  {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    position: 'prefix',
    decimalPlaces: 2,
    locale: 'en-AU',
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    position: 'prefix',
    decimalPlaces: 2,
    locale: 'en-GB',
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    position: 'suffix',
    decimalPlaces: 2,
    locale: 'de-DE',
  },
  {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    position: 'prefix',
    decimalPlaces: 2,
    locale: 'en-SG',
  },
  {
    code: 'HKD',
    symbol: 'HK$',
    name: 'Hong Kong Dollar',
    position: 'prefix',
    decimalPlaces: 2,
    locale: 'zh-HK',
  },
  {
    code: 'NZD',
    symbol: 'NZ$',
    name: 'New Zealand Dollar',
    position: 'prefix',
    decimalPlaces: 2,
    locale: 'en-NZ',
  },
  {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    position: 'prefix',
    decimalPlaces: 0,
    locale: 'ja-JP',
  },
  {
    code: 'KRW',
    symbol: '₩',
    name: 'South Korean Won',
    position: 'prefix',
    decimalPlaces: 0,
    locale: 'ko-KR',
  },
];

export function findCurrencyByCode(code?: string | null): ChurchCurrencyConfig | null {
  if (!code) return null;
  return POPULAR_CURRENCIES.find((c) => c.code.toUpperCase() === String(code).toUpperCase()) || null;
}

export function normalizeCurrencyConfig(config?: Partial<ChurchCurrencyConfig> | string | null): ChurchCurrencyConfig {
  if (!config) {
    return { ...DEFAULT_CURRENCY_CONFIG };
  }
  if (typeof config === 'string') {
    const matched = findCurrencyByCode(config);
    return matched ? { ...matched } : { ...DEFAULT_CURRENCY_CONFIG, code: config, symbol: config };
  }
  if (typeof config !== 'object') {
    return { ...DEFAULT_CURRENCY_CONFIG };
  }
  const code = config.code || (config as any).currencyCode;
  const symbol = config.symbol || (config as any).currencySymbol;
  const matched = findCurrencyByCode(code);
  return {
    code: code || matched?.code || DEFAULT_CURRENCY_CONFIG.code,
    symbol: symbol || matched?.symbol || DEFAULT_CURRENCY_CONFIG.symbol,
    name: config.name || matched?.name || DEFAULT_CURRENCY_CONFIG.name,
    position: config.position || matched?.position || DEFAULT_CURRENCY_CONFIG.position,
    decimalPlaces: typeof config.decimalPlaces === 'number' ? config.decimalPlaces : (matched?.decimalPlaces ?? DEFAULT_CURRENCY_CONFIG.decimalPlaces),
    locale: config.locale || matched?.locale || DEFAULT_CURRENCY_CONFIG.locale,
  };
}
