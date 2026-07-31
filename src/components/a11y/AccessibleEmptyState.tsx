import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/theme';

export interface AccessibleEmptyStateProps {
  title: string;
  message?: string;
  style?: ViewStyle;
}

export const AccessibleEmptyState: React.FC<AccessibleEmptyStateProps> = ({ title, message, style }) => {
  return (
    <View style={[styles.container, style]} accessible={true} accessibilityRole="text">
      <Text style={styles.title} allowFontScaling={true}>{title}</Text>
      {message ? <Text style={styles.message} allowFontScaling={true}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
