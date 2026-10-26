import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "apps/**/tests/**/*.test.{ts,tsx}",
      "packages/**/tests/**/*.test.{ts,tsx}",
      "tools/**/tests/**/*.test.ts",
    ],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
