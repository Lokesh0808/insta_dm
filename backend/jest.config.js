/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/controllers/**/*.ts',
    'src/utils/**/*.ts',
    'src/webhooks/**/*.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  testTimeout: 30000,
  verbose: true,
};
