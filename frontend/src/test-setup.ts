import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest doesn't auto-register Testing Library's cleanup the way Jest does —
// without this, each render() accumulates in the shared jsdom document and
// later tests see duplicate elements from earlier tests.
afterEach(() => {
  cleanup();
});
