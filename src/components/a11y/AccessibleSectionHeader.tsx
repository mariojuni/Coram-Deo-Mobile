import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

export const AccessibleSectionHeader: React.FC<TextProps> = ({ style, ...props }) => {
  return (
    <Text
      {...props}
      style={[styles.header, style]}
      accessibilityRole="header"
      allowFontScaling={true}
    />
  );
};

const styles = StyleSheet.create({
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
  },
});
