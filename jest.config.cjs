/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.ts',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          module: 'CommonJS',
          moduleResolution: 'node',
          allowImportingTsExtensions: false,
          noEmit: false,
          strict: true,
          resolveJsonModule: true,
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
          },
          types: ['jest', '@testing-library/jest-dom'],
        },
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@ionic|ionicons|@stencil|lit|@lit)/)',
  ],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/__tests__/**',
  ],
};

module.exports = config;
