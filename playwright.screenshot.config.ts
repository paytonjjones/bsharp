import { defineConfig } from "@playwright/test";
import { DEVICE } from "./tests/device";

export default defineConfig({
  testDir: "./tests/screenshot",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: "http://localhost:8080",
    ...DEVICE,
  },
  projects: [
    {
      name: "chromium",
      use: { ...DEVICE },
    },
  ],
  webServer: {
    command: "npx http-server dist -p 8080 -c-1 --silent",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
