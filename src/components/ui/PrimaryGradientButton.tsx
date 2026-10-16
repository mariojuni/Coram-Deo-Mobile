import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibleButton } from '../a11y/AccessibleButton';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

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
  iconRight?: React.ReactNode;
  maxWidth?: number | string;
  size?: 'sm' | 'md' | 'lg';
}

export const PrimaryGradientButton: React.FC<PrimaryGradientButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  colors = ["#FF6596", "#B66DFF"],
  disabledColors = ["#D1D5DB", "#9CA3AF"],
  shadowColor = "#FF6596",
  style,
  textStyle,
  accessibilityLabel,
  iconRight,
  maxWidth,
  size,
}) => {
  const { isSmallDevice, isLandscapeOrFlexFold, isTabletOrDesktop } = useResponsiveLayout();

  // Responsive padding calculation
  let verticalPadding = isLandscapeOrFlexFold ? 12 : isSmallDevice ? 14 : 17;
  if (size === 'sm') verticalPadding = 10;
  if (size === 'lg') verticalPadding = isSmallDevice ? 16 : 19;

  const buttonRadius = isSmallDevice ? 16 : 20;
  const responsiveFontSize = isSmallDevice ? 15 : 16;
  const computedMaxWidth = maxWidth ?? (isTabletOrDesktop ? 480 : undefined);

  return (
    <AccessibleButton
      activeOpacity={0.8}
      style={[
        styles.wrap,
        { borderRadius: buttonRadius },
        computedMaxWidth ? { maxWidth: computedMaxWidth as any, alignSelf: 'center' } : undefined,
        !disabled && {
          shadowColor: shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ busy: loading }}
    >
      <LinearGradient
        colors={disabled ? disabledColors : colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          {
            paddingVertical: verticalPadding,
            borderRadius: buttonRadius,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.contentRow}>
            <Text
              style={[
                styles.text,
                { fontSize: responsiveFontSize },
                textStyle,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {title}
            </Text>
            {iconRight && <View style={{ marginLeft: 8 }}>{iconRight}</View>}
          </View>
        )}
      </LinearGradient>
    </AccessibleButton>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 20,
  },
  disabled: {
    opacity: 0.6,
  },
  gradient: {
    width: "100%",
    flexDirection: "row",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    textAlign: "center",
  },
});
