import { useChurchStore } from '../store/useChurchStore';
import { 
  ChurchCurrencyConfig, 
  DEFAULT_CURRENCY_CONFIG, 
  normalizeCurrencyConfig 
} from '../config/currencies';

export interface FormatCurrencyOptions {
  compact?: boolean;
  decimals?: number;
  showSymbol?: boolean;
}

export function formatCurrency(
  amount: number | string | null | undefined,
  overrideConfig?: Partial<ChurchCurrencyConfig> | null,
  options: FormatCurrencyOptions = {}
): string {
  const numeric = typeof amount === 'number' ? amount : Number(amount) || 0;
  const storeCurrency = useChurchStore.getState().currency;
  const cfg = normalizeCurrencyConfig(overrideConfig ? { ...storeCurrency, ...overrideConfig } : storeCurrency);

  const {
    decimals = cfg.decimalPlaces,
    showSymbol = true,
    compact = false,
  } = options;

  if (compact && Math.abs(numeric) >= 1000) {
    const isNegative = numeric < 0;
    const abs = Math.abs(numeric);
    let divisor = 1;
    let suffixLetter = '';

    if (abs >= 1_000_000_000) {
      divisor = 1_000_000_000;
      suffixLetter = 'B';
    } else if (abs >= 1_000_000) {
      divisor = 1_000_000;
      suffixLetter = 'M';
    } else {
      divisor = 1000;
      suffixLetter = 'k';
    }

    const value = (abs / divisor).toLocaleString(cfg.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });

    const core = `${value}${suffixLetter}`;
    const sign = isNegative ? '-' : '';

    if (!showSymbol) return `${sign}${core}`;
    return cfg.position === 'suffix'
      ? `${sign}${core} ${cfg.symbol}`
      : `${sign}${cfg.symbol} ${core}`;
  }

  try {
    const formatted = Math.abs(numeric).toLocaleString(cfg.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const sign = numeric < 0 ? '-' : '';

    if (!showSymbol) return `${sign}${formatted}`;
    if (cfg.position === 'suffix') {
      return `${sign}${formatted} ${cfg.symbol}`;
    }
    return `${sign}${cfg.symbol} ${formatted}`;
  } catch (err) {
    const formatted = Math.abs(numeric).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const sign = numeric < 0 ? '-' : '';
    if (!showSymbol) return `${sign}${formatted}`;
    return cfg.position === 'suffix' ? `${sign}${formatted} ${cfg.symbol}` : `${sign}${cfg.symbol} ${formatted}`;
  }
}

export function getCurrencySymbol(overrideConfig?: Partial<ChurchCurrencyConfig> | null): string {
  const storeCurrency = useChurchStore.getState().currency;
  const cfg = normalizeCurrencyConfig(overrideConfig ? { ...storeCurrency, ...overrideConfig } : storeCurrency);
  return cfg.symbol || DEFAULT_CURRENCY_CONFIG.symbol;
}

export function getCurrencyCode(overrideConfig?: Partial<ChurchCurrencyConfig> | null): string {
  const storeCurrency = useChurchStore.getState().currency;
  const cfg = normalizeCurrencyConfig(overrideConfig ? { ...storeCurrency, ...overrideConfig } : storeCurrency);
  return cfg.code || DEFAULT_CURRENCY_CONFIG.code;
}
