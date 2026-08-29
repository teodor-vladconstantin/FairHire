import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["contracts/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["node_modules/**", "cli/**", ".next/**"],
  },
});
