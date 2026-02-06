import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

test("play button is active after init", async ({ page }) => {
  const playButton = page.locator("#play-button");
  await expect(playButton).toBeVisible();
  await expect(playButton).not.toHaveClass(/deactivated/);
});

test("next button is deactivated until flag selected", async ({ page }) => {
  const nextButton = page.locator("#next-chord");
  await expect(nextButton).toHaveClass(/deactivated/);

  // Click play to start audio, wait for audio to "play", then select a flag
  await page.locator("#play-button").click();
  await page.waitForTimeout(1000);
  await page.locator("#red-flag .flag").click();

  await expect(nextButton).not.toHaveClass(/deactivated/);
});

test("selecting a flag shows correct or incorrect feedback", async ({
  page,
}) => {
  await page.locator("#play-button").click();
  await page.waitForTimeout(1000);

  // At default level, red and yellow are visible. Click red.
  const redFlag = page.locator("#red-flag .flag");
  await redFlag.click();

  // The clicked flag must get exactly one feedback class
  const isCorrect = await redFlag.evaluate((el) =>
    el.classList.contains("flag-correct"),
  );
  const isIncorrect = await redFlag.evaluate((el) =>
    el.classList.contains("flag-incorrect"),
  );
  expect(isCorrect || isIncorrect).toBe(true);
  expect(isCorrect && isIncorrect).toBe(false);
});

test("wrong flag shows flag-incorrect and correct flag is revealed", async ({
  page,
}) => {
  await page.locator("#play-button").click();
  await page.waitForTimeout(1000);

  // Click red; if it happens to be wrong, the correct flag (yellow) gets flag-correct
  const redFlag = page.locator("#red-flag .flag");
  const yellowFlag = page.locator("#yellow-flag .flag");
  await redFlag.click();

  const redIsIncorrect = await redFlag.evaluate((el) =>
    el.classList.contains("flag-incorrect"),
  );

  if (redIsIncorrect) {
    // Red was wrong, so yellow must be marked correct
    await expect(yellowFlag).toHaveClass(/flag-correct/);
  } else {
    // Red was correct — verify no incorrect class
    await expect(redFlag).toHaveClass(/flag-correct/);
    await expect(redFlag).not.toHaveClass(/flag-incorrect/);
  }
});

test("stats counter increments after answering", async ({ page }) => {
  await expect(page.locator("#stats-correct")).toHaveText("0");
  await expect(page.locator("#stats-total")).toHaveText("0");

  await page.locator("#play-button").click();
  await page.waitForTimeout(1000);
  await page.locator("#red-flag .flag").click();

  await expect(page.locator("#stats-total")).toHaveText("1");
});

test("next button advances and resets flag feedback", async ({ page }) => {
  // Answer first question
  await page.locator("#play-button").click();
  await page.waitForTimeout(1000);
  await page.locator("#red-flag .flag").click();

  // Verify feedback is applied
  const redFlag = page.locator("#red-flag .flag");
  const hasCorrect = await redFlag.evaluate((el) =>
    el.classList.contains("flag-correct"),
  );
  const hasIncorrect = await redFlag.evaluate((el) =>
    el.classList.contains("flag-incorrect"),
  );
  expect(hasCorrect || hasIncorrect).toBe(true);

  // Click next
  await page.locator("#next-chord").click();
  await page.waitForTimeout(500);

  // Feedback classes should be removed from all flags
  await expect(redFlag).not.toHaveClass(/flag-correct/);
  await expect(redFlag).not.toHaveClass(/flag-incorrect/);
});

test("reset clears stats to zero", async ({ page }) => {
  // Answer a question first
  await page.locator("#play-button").click();
  await page.waitForTimeout(1000);
  await page.locator("#red-flag .flag").click();

  await expect(page.locator("#stats-total")).toHaveText("1");

  // Click reset
  await page.locator("#reset-button").click();

  await expect(page.locator("#stats-correct")).toHaveText("0");
  await expect(page.locator("#stats-total")).toHaveText("0");
});
