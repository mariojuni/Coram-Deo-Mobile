import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';

export interface AccessibleButtonProps extends TouchableOpacityProps {
  accessibilityLabel: string; // Enforced
  loading?: boolean;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  disabled,
  loading,
  style,
  ...props
}) => {
  // Ensure minimum touch target size (44 on iOS, 48 on Android)
  const minDimension = Platform.OS === 'android' ? 48 : 44;
  
  const baseStyle: ViewStyle = {
    minWidth: minDimension,
    minHeight: minDimension,
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <TouchableOpacity
      {...props}
      style={[baseStyle, style]}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
        ...accessibilityState,
      }}
    >
      {loading ? <ActivityIndicator size="small" /> : children}
    </TouchableOpacity>
  );
};
