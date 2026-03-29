import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('✓ E2E tests completed');
}

export default globalTeardown;
