import {
  buildPhoneNumber,
  formatNationalNumber,
  getCountryByIso,
  isValidNationalNumber,
  parsePhoneNumber,
  sanitizeNationalNumber,
} from '@/utils/phone';

describe('phone utils', () => {
  const PH = getCountryByIso('PH');
  const US = getCountryByIso('US');

  it('parses PH numbers in various formats', () => {
    expect(parsePhoneNumber('+639171234567')).toEqual({ country: PH, national: '9171234567' });
    expect(parsePhoneNumber('09171234567')).toEqual({ country: PH, national: '9171234567' });
    expect(parsePhoneNumber('917 123 4567')).toEqual({ country: PH, national: '9171234567' });
  });

  it('detects non-PH country codes', () => {
    expect(parsePhoneNumber('+14155550123').country.dialCode).toBe('+1');
    expect(parsePhoneNumber('+447911123456').country.iso).toBe('GB');
    expect(parsePhoneNumber('+85291234567').country.iso).toBe('HK');
    expect(parsePhoneNumber('0065 9123 4567').country.iso).toBe('SG');
  });

  it('returns empty national for empty input', () => {
    expect(parsePhoneNumber('').national).toBe('');
    expect(buildPhoneNumber(PH, '')).toBe('');
  });

  it('builds compact international value', () => {
    expect(buildPhoneNumber(US, '4155550123')).toBe('+14155550123');
  });

  it('sanitizes and formats national numbers', () => {
    expect(sanitizeNationalNumber('0917-123-45678999', PH)).toBe('9171234567');
    expect(formatNationalNumber('9171234567', PH)).toBe('917 123 4567');
  });

  it('validates national number length', () => {
    expect(isValidNationalNumber('')).toBe(true);
    expect(isValidNationalNumber('12345')).toBe(false);
    expect(isValidNationalNumber('9171234567')).toBe(true);
  });
});
