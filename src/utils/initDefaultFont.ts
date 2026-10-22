import React from 'react';

/**
 * Initializes 'Inter' as the global default font family for React Native's Text and TextInput
 * components across the entire application, while respecting any explicit `fontFamily` overrides.
 */
export function initDefaultFont() {
  try {
    // Patch React Native's Text component
    const TextModule = require('react-native/Libraries/Text/Text');
    const OriginalText = TextModule?.default;

    if (OriginalText && !(OriginalText as any).__hasDefaultInterFont) {
      const PatchedText = React.forwardRef<any, any>((props, ref) => {
        const { style, ...rest } = props;
        const combinedStyle = Array.isArray(style)
          ? [{ fontFamily: 'Inter' }, ...style]
          : [{ fontFamily: 'Inter' }, style];
        return React.createElement(OriginalText, {
          ref,
          ...rest,
          style: combinedStyle,
        });
      });

      (PatchedText as any).__hasDefaultInterFont = true;
      Object.assign(PatchedText, OriginalText);
      TextModule.default = PatchedText;
    }
  } catch (e) {
    // Graceful fallback if internal module resolution differs
  }

  try {
    // Patch React Native's TextInput component
    const TextInputModule = require('react-native/Libraries/Components/TextInput/TextInput');
    const OriginalTextInput = TextInputModule?.default;

    if (OriginalTextInput && !(OriginalTextInput as any).__hasDefaultInterFont) {
      const PatchedTextInput = React.forwardRef<any, any>((props, ref) => {
        const { style, ...rest } = props;
        const combinedStyle = Array.isArray(style)
          ? [{ fontFamily: 'Inter' }, ...style]
          : [{ fontFamily: 'Inter' }, style];
        return React.createElement(OriginalTextInput, {
          ref,
          ...rest,
          style: combinedStyle,
        });
      });

      (PatchedTextInput as any).__hasDefaultInterFont = true;
      Object.assign(PatchedTextInput, OriginalTextInput);
      TextInputModule.default = PatchedTextInput;
    }
  } catch (e) {
    // Graceful fallback
  }
}

initDefaultFont();
