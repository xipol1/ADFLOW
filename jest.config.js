module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    'services/**/*.js',
    'lib/**/*.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
