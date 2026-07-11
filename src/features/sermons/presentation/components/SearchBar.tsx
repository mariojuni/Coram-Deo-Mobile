import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, onClear, placeholder = 'Search sermons...' }: SearchBarProps) {
  const colors = useTheme();

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.backgroundElement,
      }
    ]}>
      <Search size={20} color={colors.textSecondary} style={styles.icon} />
      
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text }]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {value.length > 0 && (
        <TouchableOpacity
          onPress={onClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  icon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
});
