import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration test files share one real Postgres test database and each
    // truncates shared tables in afterEach — running files in parallel causes
    // cross-file race conditions (one file's truncate wipes another's
    // in-flight row). Found this the hard way when adding a second
    // integration test file; unit-test-only files pay a small, acceptable
    // speed cost for this safety.
    fileParallelism: false,
  },
});
