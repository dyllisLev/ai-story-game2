// test/setup.ts — Global test configuration for vitest

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with DOM testing library matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});
