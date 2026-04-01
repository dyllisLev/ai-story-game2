# E2E Test Setup Guide

## Prerequisites

1. **Frontend Dev Server Running**: The frontend must be running on `http://localhost:5173`
   ```bash
   ./dev.sh start frontend  # or npm run dev:frontend
   ```

2. **Dependencies Installed**: Ensure E2E dependencies are installed
   ```bash
   pnpm install
   npx playwright install
   ```

## Configuration

### baseURL Configuration

The E2E test suite uses a centralized configuration file at `e2e/config.ts`:

```typescript
export const e2eConfig = {
  baseURL: 'http://localhost:5173',
  navigationTimeout: 10000,
  elementTimeout: 5000,
  searchDebounce: 400,
};
```

**Important**: All page objects import and use `e2eConfig.baseURL` for navigation:

```typescript
import { e2eConfig } from '../config';

async goto() {
  await this.page.goto(e2eConfig.baseURL + '/');
  await this.page.waitForLoadState('networkidle');
}
```

This ensures consistent URL resolution across all page objects and prevents "Cannot navigate to invalid URL" errors.

### Why This Approach?

Playwright's built-in `baseURL` configuration in `playwright.config.ts` works for test files, but page objects created with `new PageObject(page)` don't always inherit this configuration properly. By explicitly importing and using `e2eConfig.baseURL`, we guarantee that all page navigations use the correct base URL.

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run in headed mode (visible browser)
```bash
npm run test:e2e:headed
```

### Run specific test file
```bash
npx playwright test --config e2e/playwright.config.ts e2e/tests/home/home-navigation.spec.ts
```

## Page Object Model

The test suite uses the Page Object Model pattern with fixtures:

- `e2e/fixtures/base.fixture.ts` - Defines test fixtures for all page objects
- `e2e/pages/home.page.ts` - HomePage object
- `e2e/pages/play.page.ts` - PlayPage object
- `e2e/pages/editor.page.ts` - EditorPage object
- `e2e/pages/admin.page.ts` - AdminPage object

### Example Test

```typescript
import { test, expect } from '../../fixtures/base.fixture';

test.describe('Home 페이지 네비게이션', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();  // Uses e2eConfig.baseURL internally
    await homePage.waitForStoriesLoaded();
  });

  test('스토리 카드 클릭 시 /play/:storyId로 이동', async ({ homePage }) => {
    const cardCount = await homePage.storyCards.count();
    if (cardCount > 0) {
      await homePage.storyCards.first().click();
      await expect(homePage.page).toHaveURL(/\/play\//);
    }
  });
});
```

## Troubleshooting

### "Cannot navigate to invalid URL" Error

**Symptom**: All tests fail with navigation errors when using relative URLs.

**Solution**: Ensure all page objects import and use `e2eConfig.baseURL`:
```typescript
import { e2eConfig } from '../config';
await this.page.goto(e2eConfig.baseURL + '/');
```

### Tests fail with "ECONNREFUSED"

**Symptom**: Tests can't connect to `http://localhost:5173`.

**Solution**: Start the frontend dev server:
```bash
./dev.sh start frontend
```

### Timeout errors

**Symptom**: Tests timeout waiting for elements or navigation.

**Solution**:
1. Check if the frontend is running properly
2. Verify the backend is accessible if needed
3. Increase timeout in `e2e/config.ts` if needed

## Test Structure

```
e2e/
├── config.ts                 # Centralized configuration (baseURL, timeouts)
├── playwright.config.ts      # Playwright framework configuration
├── fixtures/
│   └── base.fixture.ts      # Test fixtures with page objects
├── pages/
│   ├── home.page.ts         # HomePage page object
│   ├── play.page.ts         # PlayPage page object
│   ├── editor.page.ts       # EditorPage page object
│   └── admin.page.ts        # AdminPage page object
├── tests/
│   ├── home/                # Home page E2E tests
│   ├── play/                # Play page E2E tests
│   ├── editor/              # Editor page E2E tests
│   └── admin/               # Admin page E2E tests
└── test-results/            # Test execution results (generated)
```

## Best Practices

1. **Always use page objects**: Never use `page.goto()` directly in test files
2. **Wait for network idle**: Use `waitForLoadState('networkidle')` after navigation
3. **Use locators**: Prefer `getByRole()`, `getByLabel()`, `getByText()` over CSS selectors
4. **Handle dynamic content**: Wait for elements before interacting with them
5. **Check element visibility**: Use conditional checks for optional elements
6. **Clean up**: Use `test.beforeEach` and `test.afterEach` for setup/teardown

## CI/CD Integration

For automated testing in CI/CD pipelines:

1. Start the dev server with `./dev.sh start frontend`
2. Wait for server to be ready (check `http://localhost:5173`)
3. Run `npm run test:e2e`
4. Collect and upload test results

Example CI script:
```bash
#!/bin/bash
./dev.sh start frontend
sleep 10  # Wait for server
npm run test:e2e
RESULT=$?
./dev.sh stop
exit $RESULT
```
