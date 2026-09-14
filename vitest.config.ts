import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // The site renderer is JSX without a React import (Next's automatic runtime); match it here.
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
