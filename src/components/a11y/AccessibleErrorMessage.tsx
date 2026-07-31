import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export interface AccessibleErrorMessageProps extends TextProps {
  error: string;
}

export const AccessibleErrorMessage: React.FC<AccessibleErrorMessageProps> = ({ error, style, ...props }) => {
  if (!error) return null;
  
  return (
    <Text
      {...props}
      style={[styles.errorText, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      allowFontScaling={true}
    >
      {error}
    </Text>
  );
};

const styles = StyleSheet.create({
  errorText: {
    color: Colors.light.error,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
});
