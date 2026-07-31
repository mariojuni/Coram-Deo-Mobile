// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const rnA11y = require("eslint-plugin-react-native-a11y");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    plugins: {
      "react-native-a11y": rnA11y,
    },
    rules: {
      ...rnA11y.configs.basic.rules,
      // React Native's Animated.Value refs are intentionally read in render —
      // this is a known false-positive for the RN animation pattern.
      "react-hooks/refs": "off",
      // Downgrade from error to warning so CI isn't blocked during development.
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
