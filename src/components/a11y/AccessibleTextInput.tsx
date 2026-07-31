import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/theme';

export interface AccessibleTextInputProps extends TextInputProps {
  label: string; // Visible label, also acts as accessibilityLabel if not overridden
  error?: string; // Error message
  containerStyle?: ViewStyle;
}

export const AccessibleTextInput = React.forwardRef<TextInput, AccessibleTextInputProps>(
  ({ label, error, containerStyle, style, accessibilityLabel, ...props }, ref) => {
    return (
      <View style={[styles.container, containerStyle]}>
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
        <TextInput
          ref={ref}
          style={[styles.input, error ? styles.inputError : null, style]}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityState={{
            disabled: props.editable === false,
          }}
          aria-invalid={!!error}
          aria-errormessage={error}
          // Default allowFontScaling is true in RN, ensure it's explicitly stated
          allowFontScaling={true}
          {...props}
        />
        {error ? (
          <Text
            style={styles.errorText}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    color: Colors.light.text, // Assume light mode for default styling, should be themed in production
  },
  input: {
    minHeight: 48, // Minimum touch target size
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.light.text,
  },
  inputError: {
    borderColor: Colors.light.error, // Ensure this exists or use a fallback
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 14,
    marginTop: 4,
  },
});
