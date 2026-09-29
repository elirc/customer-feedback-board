import { defineConfig } from "@playwright/test";
if (
  process.env.FEEDBACK_TEST_OWNED !== "astra-feedback-verify" ||
  !process.env.FEEDBACK_DATABASE_PATH?.includes("astra-feedback-verify-")
)
  throw new Error(
    "Run browser checks through npm run verify; an owned fixture is required.",
  );
export default defineConfig({
  testDir: "browser-tests",
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          process.env.FEEDBACK_BROWSER_REPORT || ".verification/browser.json",
      },
    ],
  ],
  use: { baseURL: "http://127.0.0.1:3011", trace: "retain-on-failure" },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3011",
    url: "http://127.0.0.1:3011/login",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
