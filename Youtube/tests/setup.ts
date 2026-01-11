/**
 * Vitest Test Setup
 *
 * Global setup for all tests. Runs before each test file.
 */

import { beforeAll, afterAll, vi } from 'vitest';

// ===========================================
// Environment Setup
// ===========================================

beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Mock console methods in test to reduce noise
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});

  // Keep error and warn for debugging
  // vi.spyOn(console, 'error').mockImplementation(() => {});
  // vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ===========================================
// Global Test Utilities
// ===========================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a mock delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock API response generator
 */
export function mockApiResponse<T>(data: T, delay = 0): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}
