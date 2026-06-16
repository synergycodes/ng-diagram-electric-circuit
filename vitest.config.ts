import { defineConfig } from 'vitest/config';

// Standalone Vitest config. The unit tests cover pure logic (geometry, bend
// folding, reshape, guards) with no Angular TestBed, so they run directly under
// Vitest without the Angular unit-test builder (which only ships in Angular 20+).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
