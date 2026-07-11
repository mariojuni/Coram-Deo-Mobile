import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, useColorScheme } from 'react-native';
import { useState } from 'react';
import { ArrowUpDown, Check, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { SermonSort } from '../../domain/sermon.types';
import * as Haptics from 'expo-haptics';

interface SortDropdownProps {
  activeSort: SermonSort;
  onSortChange: (sort: SermonSort) => void;
  iconOnly?: boolean;
}

const SORT_OPTIONS: { value: SermonSort; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'alphabetical', label: 'A-Z' },
];

export function SortDropdown({ activeSort, onSortChange, iconOnly = false }: SortDropdownProps) {
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const [isOpen, setIsOpen] = useState(false);

  const activeLabel = SORT_OPTIONS.find((opt) => opt.value === activeSort)?.label || 'Newest First';

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
  };

  const handleSelect = (sort: SermonSort) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSortChange(sort);
    setIsOpen(false);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handleOpen}
        style={[styles.trigger, { backgroundColor: colors.backgroundElement }]}
        activeOpacity={0.7}
      >
        <ArrowUpDown size={16} color={colors.text} />
        {!iconOnly && (
          <Text style={[styles.triggerText, { color: colors.text }]}>
            {activeLabel}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <Pressable 
            style={[
              styles.bottomSheet,
              { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFF' }
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Grabber */}
            <View style={styles.grabberContainer}>
              <View style={[styles.grabber, { backgroundColor: colors.textSecondary }]} />
            </View>

            <View style={styles.header}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Sort By</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {SORT_OPTIONS.map((option) => {
              const isActive = activeSort === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  style={[
                    styles.option,
                    { backgroundColor: isActive ? 'rgba(255, 101, 150, 0.1)' : 'transparent' },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { 
                        color: isActive ? '#FF6596' : colors.text,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isActive && <Check size={20} color="#FF6596" strokeWidth={3} />}
                </TouchableOpacity>
              );
            })}
            
            {/* Safe area padding */}
            <View style={{ height: 40 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 24,
  },
  grabberContainer: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    padding: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderRadius: 16,
    marginBottom: Spacing.two,
  },
  optionText: {
    fontSize: 16,
  },
});
