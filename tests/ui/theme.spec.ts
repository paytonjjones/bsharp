import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

test("app starts in dark mode", async ({ page }) => {
  await expect(page.locator("body")).toHaveClass(/colorscheme-dark/);
});

test("theme toggle switches to light", async ({ page }) => {
  await page.locator("#mode-toggle").click();

  await expect(page.locator("body")).toHaveClass(/colorscheme-light/);
  await expect(page.locator("body")).not.toHaveClass(/colorscheme-dark/);
});

test("double toggle returns to dark", async ({ page }) => {
  await page.locator("#mode-toggle").click();
  await page.locator("#mode-toggle").click();

  await expect(page.locator("body")).toHaveClass(/colorscheme-dark/);
  await expect(page.locator("body")).not.toHaveClass(/colorscheme-light/);
});

test("download button hidden by default", async ({ page }) => {
  await expect(page.locator("#download-link")).not.toHaveClass(/visible/);
});
