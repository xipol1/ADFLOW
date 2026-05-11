process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

// MMS exposes its URI via __MMS_URI__ (set by tests/jest.global-setup.js).
// Tests that want a real DB opt in by setting MONGODB_URI in a beforeAll
// using the helper tests/helpers/useMongo.js — this keeps tests that rely
// on the 503-no-DB bail path unchanged.
