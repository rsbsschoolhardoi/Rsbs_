import { lazy } from 'react';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a lazy-loaded component that automatically retries the dynamic import
 * a few times before giving up. This prevents the app from being stuck on the
 * Suspense fallback after a brief network interruption or when the browser
 * restores a background tab.
 */
export function lazyWithRetry<T extends { default: React.ComponentType<any> }>(
  importer: () => Promise<T>
) {
  const load = async (): Promise<T> => {
    let lastError: unknown;
    const retries = 3;
    for (let i = 0; i < retries; i++) {
      try {
        return await importer();
      } catch (err) {
        lastError = err;
        if (i < retries - 1) {
          await sleep(300 * (i + 1));
        }
      }
    }
    throw lastError;
  };

  return lazy(load);
}
