// Vitest setup file - runs before all tests
import { vi } from 'vitest'

// Mock environment variables for all tests
process.env.NODE_ENV = 'test'
process.env.PORT = '3000'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
process.env.API_KEY_ENCRYPTION_SECRET = 'test-encryption-secret-32chars'
process.env.ADMIN_BASIC_AUTH_PASSWORD = 'test-admin-password'

// Suppress console logs during tests (optional - comment out for debugging)
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks()
})
