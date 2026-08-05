import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
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
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { Colors } from '@/constants/theme';
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
  disableDarkMode?: boolean;
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
  disableDarkMode = false,
}: ModernDropdownProps<T>) {
  const systemColors = useTheme();
  const systemColorScheme = useColorScheme();

  const colorScheme = disableDarkMode ? 'light' : systemColorScheme;
  const colors = disableDarkMode ? Colors.light : systemColors;
  const isDarkMode = colorScheme === 'dark';

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
      {label && !renderTrigger && (
        <Text style={[styles.label, { color: isDarkMode ? colors.textSecondary : '#1a1a1a' }]}>
          {label}
        </Text>
      )}
      
      {renderTrigger ? (
        renderTrigger(selectedOption, handleOpen)
      ) : (
        <TouchableOpacity
          style={[
            styles.trigger,
            { 
              backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
              borderColor: isDarkMode ? '#2C2C2E' : '#e5e5e5',
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
                { color: selectedOption ? (isDarkMode ? colors.text : '#1a1a1a') : '#8e8e93' }
              ]}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </Text>
          </View>
          <ChevronDown size={18} color={isDarkMode ? colors.textSecondary : '#666'} />
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
                backgroundColor: isDarkMode ? '#1C1C1E' : '#FAFAFA',
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Header (Adopting EventDetailsModal pattern) */}
            <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
              {!isDarkMode && <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? '#1C1C1E' : 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
              <View style={[styles.dragHandle, isDarkMode && { backgroundColor: '#48484A' }]} />
              <View style={styles.headerContent}>
                <View style={styles.headerCirclePlaceholder} />
                <Text style={[styles.headerTitle, { color: isDarkMode ? colors.text : '#1a1a1a' }]} numberOfLines={1}>
                  {label || placeholder}
                </Text>
                <BounceCard
                  bounceScale={0.85}
                  style={[styles.headerCircle, isDarkMode && { backgroundColor: '#2C2C2E', borderWidth: 0, elevation: 0 }]}
                  onPress={handleClose}
                  hitSlop={8}
                  activeOpacity={0.8}
                >
                  <X size={24} color={isDarkMode ? colors.text : '#111827'} strokeWidth={2} />
                </BounceCard>
              </View>
            </View>

            <View style={styles.modalBody}>
              {searchable && (
                <View style={[styles.searchRow, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F3F4F6' }]}>
                  <Search size={18} color={isDarkMode ? colors.textSecondary : '#9CA3AF'} />
                  <TextInput
                    style={[styles.searchInput, { color: isDarkMode ? colors.text : '#1F2937' }]}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={isDarkMode ? colors.textSecondary : '#9CA3AF'}
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                  {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                      <X size={16} color={isDarkMode ? colors.textSecondary : '#9CA3AF'} />
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
                        { 
                          backgroundColor: isActive 
                            ? (isDarkMode ? 'rgba(255, 101, 150, 0.15)' : 'rgba(255, 101, 150, 0.08)') 
                            : (isDarkMode ? '#2C2C2E' : '#FFF') 
                        }
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionContent}>
                        {option.icon && <View style={styles.iconContainer}>{option.icon}</View>}
                        <Text
                          style={[
                            styles.optionText,
                            { 
                              color: isActive ? '#FF6596' : (isDarkMode ? colors.text : '#1F2937'),
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
            </View>
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 0,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '400',
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
    height: '80%',
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    overflow: 'hidden',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 38,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerCirclePlaceholder: {
    width: 40,
    height: 40,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  modalBody: {
    flex: 1,
    paddingTop: 72,
    paddingHorizontal: 20,
  },
  optionsList: {
    flex: 1,
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
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
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
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
});
