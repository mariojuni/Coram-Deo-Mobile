// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
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
