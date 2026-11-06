import { test, expect, type Page } from "@playwright/test";

async function setAutoPlaySettings(
  page: Page,
  autoPlay: boolean,
  durationSeconds: number,
): Promise<void> {
  await page.evaluate(({ autoPlay: enabled, duration }) => {
    const state = JSON.parse(localStorage.getItem("bsharp_state")!);
    const profile = state.profiles[state.current_profile];
    profile.auto_play = enabled;
    profile.auto_play_duration_seconds = duration;
    localStorage.setItem("bsharp_state", JSON.stringify(state));
  }, { autoPlay, duration: durationSeconds });
  await page.reload();
}

async function answer(page: Page, color: string): Promise<void> {
  await page.locator("#play-button").click();
  await page.waitForTimeout(1000);
  await page.locator(`#${color}-flag`).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__bsharp_test_deterministic_color = "red";
  });
  await page.goto("/");
});

test("auto-plays after a correct answer and keeps the completed fill during the pause", async ({ page }) => {
  await setAutoPlaySettings(page, true, 1);
  await answer(page, "red");

  const arrow = page.locator("#next-chord > i.fa-arrow-right");
  await expect(arrow).toHaveClass(/next-arrow-fill/);
  await page.waitForTimeout(850);
  await expect(page.locator("#red-flag .flag")).toHaveClass(/flag-correct/);
  const animationDuration = await arrow.evaluate((element) =>
    getComputedStyle(element, "::after").animationDuration,
  );
  expect(animationDuration).toBe("1s");

  await page.waitForTimeout(150);
  await expect(page.locator("#red-flag .flag")).toHaveClass(/flag-correct/);
  await expect(arrow).toHaveClass(/next-arrow-fill/);
  const completedClipPath = await arrow.evaluate((element) =>
    getComputedStyle(element, "::after").clipPath,
  );
  expect(completedClipPath).not.toMatch(/100%/);

  await page.waitForTimeout(300);
  await expect(page.locator("#red-flag .flag")).not.toHaveClass(/flag-correct/);
  await expect(arrow).not.toHaveClass(/next-arrow-fill/);
  await expect(page.locator("#next-chord")).toHaveClass(/deactivated/);
});

test("auto-plays after an incorrect answer", async ({ page }) => {
  await setAutoPlaySettings(page, true, 1);
  await answer(page, "yellow");

  await expect(page.locator("#yellow-flag .flag")).toHaveClass(/flag-incorrect/);
  await page.waitForTimeout(1250);
  await expect(page.locator("#yellow-flag .flag")).not.toHaveClass(/flag-incorrect/);
  await expect(page.locator("#next-chord")).toHaveClass(/deactivated/);
});

test("disabled auto play leaves the answer available", async ({ page }) => {
  await setAutoPlaySettings(page, false, 1);
  await answer(page, "red");

  const arrow = page.locator("#next-chord > i.fa-arrow-right");
  await expect(arrow).not.toHaveClass(/next-arrow-fill/);
  await page.waitForTimeout(1250);
  await expect(page.locator("#red-flag .flag")).toHaveClass(/flag-correct/);
  await expect(page.locator("#next-chord")).not.toHaveClass(/deactivated/);
});

test("manual Next cancels pending auto play", async ({ page }) => {
  await setAutoPlaySettings(page, true, 5);
  await answer(page, "red");

  await page.locator("#next-chord").click();
  await expect(page.locator("#red-flag .flag")).not.toHaveClass(/flag-correct/);
  await page.waitForTimeout(5200);
  await expect(page.locator("#stats-total")).toHaveText("1");
  await expect(page.locator("#next-chord")).toHaveClass(/deactivated/);
});
