import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
  useColorScheme
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export interface DropdownOption<T = string> {
  label: string;
  value: T;
  icon?: React.ReactNode;
}

export interface ModernDropdownProps<T = string> {
  options: DropdownOption<T>[];
  value?: T;
  onSelect: (value: T | null) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  label?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  renderTrigger?: (selectedOption: DropdownOption<T> | undefined, handleOpen: () => void) => React.ReactNode;
  clearable?: boolean;
}

export function ModernDropdown<T = string>({
  options,
  value,
  onSelect,
  placeholder = 'Select an option',
  containerStyle,
  label,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  renderTrigger,
  clearable = false,
}: ModernDropdownProps<T>) {
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = options.find((opt) => opt.value === value);

  const slideAnim = useMemo(() => new Animated.Value(500), []);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      slideAnim.setValue(500);
      fadeAnim.setValue(0);
    }
  }, [isOpen, slideAnim, fadeAnim]);

  const handleOpen = () => {
    if (!disabled) setIsOpen(true);
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsOpen(false);
      setQuery('');
    });
  };

  const handleSelect = (val: T | null) => {
    onSelect(val);
    handleClose();
  };

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const lowerQ = query.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(lowerQ));
  }, [options, searchable, query]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && !renderTrigger && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      
      {renderTrigger ? (
        renderTrigger(selectedOption, handleOpen)
      ) : (
        <TouchableOpacity
          style={[
            styles.trigger,
            { 
              backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F8F9FB',
              borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#EBEBEB',
              opacity: disabled ? 0.5 : 1 
            }
          ]}
          onPress={handleOpen}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <View style={styles.triggerContent}>
            {selectedOption?.icon && <View style={styles.iconContainer}>{selectedOption.icon}</View>}
            <Text
              style={[
                styles.triggerText,
                { color: selectedOption ? colors.text : colors.textSecondary }
              ]}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </Text>
          </View>
          <ChevronDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={handleClose}>
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View 
            style={[
              styles.bottomSheet,
              { 
                backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFF',
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.grabberContainer}>
              <View style={[styles.grabber, { backgroundColor: colors.textSecondary }]} />
            </View>

            <View style={styles.header}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {label || placeholder}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={[styles.searchRow, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F3F4F6' }]}>
                <Search size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <ScrollView 
              style={styles.optionsList} 
              contentContainerStyle={styles.optionsListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {clearable && value !== undefined && value !== null && (
                <TouchableOpacity
                  onPress={() => handleSelect(null)}
                  style={[
                    styles.optionRow,
                    { backgroundColor: 'rgba(239, 68, 68, 0.08)' }
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.iconContainer}><X size={18} color="#EF4444" /></View>
                    <Text style={[styles.optionText, { color: '#EF4444', fontWeight: '600' }]}>
                      Clear Selection
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {filteredOptions.map((option, index) => {
                const isActive = value === option.value;
                return (
                  <TouchableOpacity
                    key={String(option.value) + index}
                    onPress={() => handleSelect(option.value)}
                    style={[
                      styles.optionRow,
                      { backgroundColor: isActive ? (colorScheme === 'dark' ? 'rgba(255, 101, 150, 0.15)' : 'rgba(255, 101, 150, 0.08)') : 'transparent' }
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      {option.icon && <View style={styles.iconContainer}>{option.icon}</View>}
                      <Text
                        style={[
                          styles.optionText,
                          { 
                            color: isActive ? '#FF6596' : colors.text,
                            fontWeight: isActive ? '700' : '500',
                          }
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {isActive && <Check size={20} color="#FF6596" strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 10,
  },
  triggerText: {
    fontSize: 15,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomSheet: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  grabberContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 20,
  },
  optionsList: {
    flexGrow: 0,
  },
  optionsListContent: {
    paddingBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
});
