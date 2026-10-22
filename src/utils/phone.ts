/**
 * Phone number helpers shared by the registration / complete-profile flows.
 *
 * Phone numbers are stored in compact E.164-like form (e.g. `+639171234567`)
 * so they stay compatible with the existing phone lookup in the auth repository.
 */

export interface CountryCode {
  /** ISO 3166-1 alpha-2 code */
  iso: string;
  name: string;
  /** Dial code including the leading `+` */
  dialCode: string;
  flag: string;
  /** Max digits of the national (subscriber) number, used to cap input. */
  maxLength?: number;
  /** Whether a leading `0` in the national number is significant (e.g. Italy). */
  keepLeadingZero?: boolean;
}

export const DEFAULT_COUNTRY_ISO = 'PH';

export const COUNTRY_CODES: CountryCode[] = [
  { iso: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', maxLength: 10 },
  { iso: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', maxLength: 10 },
  { iso: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', maxLength: 10 },
  { iso: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', maxLength: 10 },
  { iso: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', maxLength: 9 },
  { iso: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', maxLength: 10 },
  { iso: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', maxLength: 8 },
  { iso: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', maxLength: 10 },
  { iso: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', maxLength: 12 },
  { iso: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', maxLength: 9 },
  { iso: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', maxLength: 10 },
  { iso: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', maxLength: 8 },
  { iso: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼', maxLength: 9 },
  { iso: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', maxLength: 11 },
  { iso: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', maxLength: 10 },
  { iso: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', maxLength: 10 },
  { iso: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', maxLength: 10 },
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', maxLength: 9 },
  { iso: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', maxLength: 9 },
  { iso: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', maxLength: 8 },
  { iso: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', maxLength: 8 },
  { iso: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', maxLength: 8 },
  { iso: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', maxLength: 8 },
  { iso: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', maxLength: 9 },
  { iso: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', maxLength: 11 },
  { iso: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', maxLength: 9 },
  { iso: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', maxLength: 11, keepLeadingZero: true },
  { iso: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', maxLength: 9 },
  { iso: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', maxLength: 9 },
  { iso: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', maxLength: 9 },
  { iso: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', maxLength: 9 },
  { iso: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', maxLength: 9 },
  { iso: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', maxLength: 8 },
  { iso: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', maxLength: 11 },
  { iso: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', maxLength: 10 },
  { iso: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', maxLength: 9 },
  { iso: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', maxLength: 10 },
  { iso: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', maxLength: 9 },
];

const MAX_E164_DIGITS = 15;

export function getCountryByIso(iso: string): CountryCode {
  return COUNTRY_CODES.find((c) => c.iso === iso) ?? COUNTRY_CODES[0];
}

function maxNationalLength(country: CountryCode): number {
  const dialDigits = country.dialCode.replace(/\D/g, '').length;
  return country.maxLength ?? MAX_E164_DIGITS - dialDigits;
}

/** Strips non-digits, the trunk prefix (leading 0) and caps the length. */
export function sanitizeNationalNumber(input: string, country: CountryCode): string {
  let digits = input.replace(/\D/g, '');
  if (!country.keepLeadingZero) {
    digits = digits.replace(/^0+/, '');
  }
  return digits.slice(0, maxNationalLength(country));
}

/** Display formatting for the national number (digits only in, spaced out). */
export function formatNationalNumber(digits: string, country: CountryCode): string {
  if (!digits) return '';
  if (country.dialCode === '+63' || country.dialCode === '+1') {
    // 3-3-4 grouping (PH: 917 123 4567, NANP: 415 555 0123)
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  // Generic grouping in blocks of 3, keeping a trailing block of 4 when it fits.
  return digits.replace(/(\d{3})(?=\d{3,})/g, '$1 ').trim();
}

/** Builds the stored value, e.g. `+639171234567`. Returns '' when no number was entered. */
export function buildPhoneNumber(country: CountryCode, nationalDigits: string): string {
  return nationalDigits ? `${country.dialCode}${nationalDigits}` : '';
}

/**
 * Parses a stored / pasted phone number into a country + national digits.
 * Handles `+<dial><number>`, `00<dial><number>`, local `09XX...` and bare digits.
 */
export function parsePhoneNumber(
  raw: string | null | undefined,
  fallbackIso: string = DEFAULT_COUNTRY_ISO
): { country: CountryCode; national: string } {
  const fallback = getCountryByIso(fallbackIso);
  if (!raw || !raw.trim()) return { country: fallback, national: '' };

  const trimmed = raw.trim();
  const isInternational = trimmed.startsWith('+') || trimmed.startsWith('00');

  if (isInternational) {
    const digits = trimmed.replace(/\D/g, '').replace(/^00/, '');
    // Longest dial code first so +852 wins over +85x / +8, etc.
    // When dial codes are shared (e.g. +1), prefer the fallback country.
    const candidates = [...COUNTRY_CODES].sort((a, b) => {
      const diff = b.dialCode.length - a.dialCode.length;
      if (diff !== 0) return diff;
      if (a.iso === fallback.iso) return -1;
      if (b.iso === fallback.iso) return 1;
      return 0;
    });
    const match = candidates.find((c) => digits.startsWith(c.dialCode.slice(1)));
    if (match) {
      return {
        country: match,
        national: sanitizeNationalNumber(digits.slice(match.dialCode.length - 1), match),
      };
    }
  }

  return { country: fallback, national: sanitizeNationalNumber(trimmed, fallback) };
}

/** Basic sanity check for an entered national number. Empty is considered valid (optional field). */
export function isValidNationalNumber(nationalDigits: string): boolean {
  if (!nationalDigits) return true;
  return nationalDigits.length >= 6 && nationalDigits.length <= 14;
}
