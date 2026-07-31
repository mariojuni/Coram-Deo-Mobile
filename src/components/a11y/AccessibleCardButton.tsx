import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ViewStyle } from 'react-native';

export interface AccessibleCardButtonProps extends TouchableOpacityProps {
  accessibilityLabel: string;
}

export const AccessibleCardButton: React.FC<AccessibleCardButtonProps> = ({
  children,
  accessibilityLabel,
  accessibilityHint,
  style,
  ...props
}) => {
  return (
    <TouchableOpacity
      {...props}
      style={[styles.card, style]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 48, // Minimum touch target size
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 8,
  },
});
