import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    include: ["tests/*.spec.ts", "tests/*.spec.tsx"],
  },
});
