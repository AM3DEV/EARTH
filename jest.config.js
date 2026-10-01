// Pure-logic unit tests (pricing, distance, validation) run in plain node
// via babel-jest — no React Native runtime needed.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
};
