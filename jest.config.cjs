module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.[jt]sx?$': 'ts-jest'
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      diagnostics: false,
      isolatedModules: true
    }
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: ['/node_modules/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};
