import { test, expect } from "@playwright/test";
import { openMenu, openProfilePanel, createProfile } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

test("non-default settings saved to new profile", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.dismiss());

  // Open profile panel and click "+"
  await openProfilePanel(page);
  await page.locator("#profile-switcher .switcher-add").click();

  // Fill required fields + set a non-default setting
  await page.locator("#profile_name_setting").fill("Custom User");
  await page
    .locator("input[name='profile_icon_selector'][value='fa-bolt']")
    .check();
  await page.locator("#persist_reaction_face_setting").check();

  await page.locator("#add-user-button").click();

  // Re-open the profile panel and check the checkbox is still checked
  const menu = page.locator("#menu-container");
  if (!(await menu.evaluate((el) => el.classList.contains("visible")))) {
    await page.locator("#hamburger-link").click();
    await expect(menu).toHaveClass(/visible/);
  }
  await page.locator("#profile-infobox-trigger").click();
  await expect(page.locator("#persist_reaction_face_setting")).toBeChecked();
});

test("chord display mode shapes_only hides letters", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.dismiss());

  await openProfilePanel(page);
  await page.locator("#profile-switcher .switcher-add").click();
  await page.locator("#profile_name_setting").fill("Shapes Only");
  await page
    .locator("input[name='profile_icon_selector'][value='fa-bolt']")
    .check();
  await page
    .locator("#chord-name-display-mode-selector")
    .selectOption("shapes_only");
  await page.locator("#add-user-button").click();

  const flagHolder = page.locator("#flag-holder");
  await expect(flagHolder).toHaveClass(/use-shapes/);
  await expect(flagHolder).not.toHaveClass(/use-letters/);
});

test("chord display mode letters_only hides shapes", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.dismiss());

  await openProfilePanel(page);
  await page.locator("#profile-switcher .switcher-add").click();
  await page.locator("#profile_name_setting").fill("Letters Only");
  await page
    .locator("input[name='profile_icon_selector'][value='fa-bolt']")
    .check();
  await page
    .locator("#chord-name-display-mode-selector")
    .selectOption("letters_only");
  await page.locator("#add-user-button").click();

  const flagHolder = page.locator("#flag-holder");
  await expect(flagHolder).toHaveClass(/use-letters/);
  await expect(flagHolder).not.toHaveClass(/use-shapes/);
});

test("switching profiles applies that profile chord level", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.dismiss());

  // Create a profile with blue level
  await openProfilePanel(page);
  await page.locator("#profile-switcher .switcher-add").click();
  await page.locator("#profile_name_setting").fill("Blue Level User");
  await page
    .locator("input[name='profile_icon_selector'][value='fa-paw']")
    .check();
  await page.locator("#add-user-button").click();

  // Change chord level to blue for the new profile
  await page.locator("#chord-selector").selectOption("blue");

  // Switch back to Guest (Guest uses fa-user icon)
  await openProfilePanel(page);
  await page
    .locator("#profile-switcher .switcher-item:has(.fa-user)")
    .click();

  // Guest should have default level (yellow)
  await expect(page.locator("#chord-selector")).toHaveValue("yellow");

  // Switch back to Blue Level User (uses fa-paw icon)
  await page
    .locator("#profile-switcher .switcher-item:has(.fa-paw)")
    .click();

  await expect(page.locator("#chord-selector")).toHaveValue("blue");
});

test("target number persists after save", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.dismiss());

  await openProfilePanel(page);
  await page.locator("#profile-switcher .switcher-add").click();
  await page.locator("#profile_name_setting").fill("Target Test");
  await page
    .locator("input[name='profile_icon_selector'][value='fa-bolt']")
    .check();
  await page.locator("#target_number_setting").fill("42");
  await page.locator("#add-user-button").click();

  // Re-open the profile panel and verify target number
  await openProfilePanel(page);
  await expect(page.locator("#target_number_setting")).toHaveValue("42");
});
