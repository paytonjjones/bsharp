import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    // Set before app code runs so selectNewColor() picks it up during init
    (window as any).__bsharp_test_deterministic_color = "red";
  });
  await page.goto("/");
});

test("play overlay with arrow pointing to play button", async ({ page }) => {
  const overlay = page.locator("#onboarding-overlay");
  await expect(overlay).toBeVisible();

  // Screenshot the control area + flag area together to show arrow-to-button relationship
  const controls = page.locator(".control-wrapper");
  const flags = page.locator("#flag-holder");

  const controlsBox = await controls.boundingBox();
  const flagsBox = await flags.boundingBox();

  await expect(page).toHaveScreenshot("play-overlay.png", {
    clip: {
      x: 0,
      y: controlsBox!.y,
      width: controlsBox!.width,
      height: flagsBox!.y + flagsBox!.height - controlsBox!.y,
    },
  });
});

test("guess overlay appearance", async ({ page }) => {
  await page.locator("#play-button").click();

  const overlay = page.locator("#onboarding-overlay");
  await expect(overlay).toBeVisible({ timeout: 5000 });
  await expect(overlay.locator(".onboarding-text")).toHaveText(
    "Guess the color",
  );

  await expect(page.locator("#flag-holder")).toHaveScreenshot(
    "guess-overlay.png",
  );
});

test("success overlay appearance", async ({ page }) => {
  await page.locator("#play-button").click();

  const overlay = page.locator("#onboarding-overlay");
  await expect(overlay).toBeVisible({ timeout: 5000 });

  // Color is forced to "red", so clicking red is always correct
  await page.locator("#red-flag .flag").click();

  await expect(overlay).toHaveAttribute("data-step", "goNext");
  await expect(overlay.locator(".onboarding-text")).toHaveText(
    "Great job! Click the arrow to continue",
  );
  await expect(page.locator("#flag-holder")).toHaveScreenshot(
    "success-overlay.png",
  );
});

test("retry overlay appearance", async ({ page }) => {
  await page.locator("#play-button").click();

  const overlay = page.locator("#onboarding-overlay");
  await expect(overlay).toBeVisible({ timeout: 5000 });

  // Color is forced to "red", so clicking yellow is always wrong
  await page.locator("#yellow-flag .flag").click();

  await expect(overlay).toHaveAttribute("data-step", "goNext");
  await expect(overlay.locator(".onboarding-text")).toHaveText(
    "Click the arrow to try again",
  );
  await expect(page.locator("#flag-holder")).toHaveScreenshot(
    "retry-overlay.png",
  );
});
