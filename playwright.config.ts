import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "*.pw.ts",
  use: { baseURL: "http://127.0.0.1:4317" },
  webServer: { command: "npx tsx tests/browser/server.mts", url: "http://127.0.0.1:4317", reuseExistingServer: false },
  projects: ["chromium", "firefox", "webkit"].map(name => ({ name, use: { ...devices[name === "chromium" ? "Desktop Chrome" : name === "firefox" ? "Desktop Firefox" : "Desktop Safari"] } })),
});
