import React from 'react';
import { StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibleButton } from '../a11y/AccessibleButton';
import { getSoftShadowStyle } from './SoftCard';

interface PrimaryGradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  colors?: readonly [string, string, ...string[]];
  disabledColors?: readonly [string, string, ...string[]];
  shadowColor?: string;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  accessibilityLabel?: string;
}

export const PrimaryGradientButton: React.FC<PrimaryGradientButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  colors = ["#FF6596", "#C084FC"],
  disabledColors = ["#D1D5DB", "#9CA3AF"],
  shadowColor,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  return (
    <AccessibleButton
      activeOpacity={0.8}
      style={[
        styles.wrap,
        !disabled && getSoftShadowStyle(24),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      loading={loading}
      accessibilityLabel={accessibilityLabel || title}
    >
      <LinearGradient
        colors={disabled ? disabledColors : colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {!loading && (
          <Text style={[styles.text, textStyle]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </AccessibleButton>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 32,
  },
  disabled: {
    opacity: 0.6,
  },
  gradient: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
