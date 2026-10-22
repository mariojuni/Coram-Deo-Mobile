import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AppModal from '@/components/ui/AppModal';
import {
  COUNTRY_CODES,
  CountryCode,
  DEFAULT_COUNTRY_ISO,
  buildPhoneNumber,
  formatNationalNumber,
  parsePhoneNumber,
  sanitizeNationalNumber,
} from '@/utils/phone';

interface PhoneNumberInputProps {
  /** Stored value in compact international form, e.g. `+639171234567`, or '' when empty. */
  value: string;
  onChangeValue: (value: string) => void;
  defaultCountryIso?: string;
  accentColor?: string;
  testID?: string;
}

export function PhoneNumberInput({
  value,
  onChangeValue,
  defaultCountryIso = DEFAULT_COUNTRY_ISO,
  accentColor = '#B66DFF',
  testID = 'phone-number-input',
}: PhoneNumberInputProps) {
  // Country is owned locally so it survives while the number field is empty.
  const [country, setCountry] = useState<CountryCode>(() => parsePhoneNumber(value, defaultCountryIso).country);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const nationalDigits = useMemo(() => {
    if (!value) return '';
    if (value.startsWith(country.dialCode)) {
      return sanitizeNationalNumber(value.slice(country.dialCode.length), country);
    }
    return parsePhoneNumber(value, country.iso).national;
  }, [value, country]);

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    const qDigits = q.replace(/\D/g, '');
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso.toLowerCase() === q ||
        (qDigits.length > 0 && c.dialCode.slice(1).startsWith(qDigits))
    );
  }, [search]);

  const handleChangeText = (text: string) => {
    // Pasting / typing a full international number auto-switches the country.
    if (text.trim().startsWith('+')) {
      const parsed = parsePhoneNumber(text, country.iso);
      setCountry(parsed.country);
      onChangeValue(buildPhoneNumber(parsed.country, parsed.national));
      return;
    }
    onChangeValue(buildPhoneNumber(country, sanitizeNationalNumber(text, country)));
  };

  const handleSelectCountry = (next: CountryCode) => {
    setCountry(next);
    onChangeValue(buildPhoneNumber(next, sanitizeNationalNumber(nationalDigits, next)));
    setPickerOpen(false);
    setSearch('');
  };

  const closePicker = () => {
    setPickerOpen(false);
    setSearch('');
  };

  return (
    <>
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          style={styles.countryButton}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Country code ${country.name} ${country.dialCode}. Tap to change`}
          testID={`${testID}-country`}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.dialCode}>{country.dialCode}</Text>
          <ChevronDown size={14} color="#888" />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          placeholder={country.iso === 'PH' ? '9XX XXX XXXX' : 'Phone number'}
          placeholderTextColor="#888"
          value={formatNationalNumber(nationalDigits, country)}
          onChangeText={handleChangeText}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          testID={testID}
        />
      </View>

      <AppModal
        isOpen={pickerOpen}
        onClose={closePicker}
        title="Select Country Code"
        hideHeader
        heightRatio={0.75}
        containerStyle={{ paddingHorizontal: 20, paddingBottom: 24, flex: 1 }}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>
            Select Country Code
          </Text>
          <TouchableOpacity
            onPress={closePicker}
            style={styles.closeBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close country code picker"
            testID={`${testID}-close`}
          >
            <X size={20} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrapper}>
          <Search size={16} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search country or code"
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            testID={`${testID}-search`}
          />
        </View>
        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => item.iso}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No matching country</Text>}
          renderItem={({ item }) => {
            const selected = item.iso === country.iso;
            return (
              <TouchableOpacity
                style={[styles.countryRow, selected && { backgroundColor: '#F5F3FF', borderColor: accentColor }]}
                onPress={() => handleSelectCountry(item)}
                activeOpacity={0.8}
                testID={`${testID}-option-${item.iso}`}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <Text style={[styles.countryName, selected && { color: accentColor }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.countryDial, selected && { color: accentColor }]}>{item.dialCode}</Text>
                {selected && <Check size={18} color={accentColor} style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            );
          }}
        />
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    gap: 4,
  },
  flag: {
    fontSize: 18,
  },
  dialCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#1a1a1a',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 6,
    gap: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  countryDial: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 24,
  },
});

export default PhoneNumberInput;
