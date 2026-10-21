module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|@shopify/flash-list|firebase|@firebase)',
  ],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/test-utils/mocks/styleMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  roots: ['<rootDir>/src'],
  modulePathIgnorePatterns: ['<rootDir>/Coram-Deo-Backend/', '<rootDir>/functions/'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
};
