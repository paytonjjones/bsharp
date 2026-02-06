import { test, expect } from "@playwright/test";
import {
  openMenu,
  openProfilePanel,
  createProfile,
  collectJsErrors,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

test("profile panel opens without JS errors", async ({ page }) => {
  const errors = collectJsErrors(page);

  await openProfilePanel(page);

  expect(errors).toHaveLength(0);
});

test("panel shows Save Changes and Delete in edit mode", async ({ page }) => {
  await openProfilePanel(page);

  await expect(page.locator("#submit-changes-button")).toBeVisible();
  await expect(page.locator("#delete-profile-button")).toBeVisible();
});

test("switcher shows exactly one active profile", async ({ page }) => {
  await openProfilePanel(page);

  const activeItems = page.locator("#profile-switcher .switcher-item.active");
  await expect(activeItems).toHaveCount(1);
});

test("add form populates defaults", async ({ page }) => {
  await openProfilePanel(page);
  await page.locator("#profile-switcher .switcher-add").click();

  // Target number should have a non-empty default
  await expect(page.locator("#target_number_setting")).not.toHaveValue("");

  // Show chord name mode should have a default selected
  const showChordMode = page.locator("#show-chord-name-mode-selector");
  await expect(showChordMode).toBeVisible();
  await expect(showChordMode).not.toHaveValue("");

  // An icon should be pre-selected
  const checkedIcon = page.locator(
    "input[name='profile_icon_selector']:checked",
  );
  await expect(checkedIcon).toHaveCount(1);
});

test("creating profile closes panel with no errors", async ({ page }) => {
  const errors = collectJsErrors(page);
  page.on("dialog", (dialog) => dialog.dismiss());

  await createProfile(page, "Test User");

  await expect(page.locator("#profile-info-container")).not.toHaveClass(
    /visible/,
  );
  expect(errors).toHaveLength(0);
});

test("switching profile updates top bar icon and name", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.dismiss());

  await createProfile(page, "Alice", "fa-bolt");

  // Profile should now be Alice (createProfile auto-switches)
  await expect(page.locator("#profile-text")).toHaveText("Alice");
  await expect(page.locator("#profile-icon")).toHaveClass(/fa-bolt/);
});

test("guest name field is disabled", async ({ page }) => {
  await openProfilePanel(page);

  await expect(page.locator("#profile_name_setting")).toBeDisabled();
});

test("guest delete button is disabled", async ({ page }) => {
  await openProfilePanel(page);

  await expect(page.locator("#delete-profile-button")).toBeDisabled();
});

test("deleting profile switches back to Guest", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());

  await createProfile(page, "ToDelete", "fa-paw");
  await expect(page.locator("#profile-text")).toHaveText("ToDelete");

  // Open profile panel and delete
  await openProfilePanel(page);
  await page.locator("#delete-profile-button").click();

  // Should switch back to Guest
  await expect(page.locator("#profile-text")).toHaveText("Guest");
});

test("hamburger is clickable with long profile name", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.dismiss());

  await createProfile(page, "A Very Long Profile Name");

  await openMenu(page);

  // Profile text should be visually truncated but still showing some name
  const profileText = page.locator("#profile-text");
  const { offsetWidth, scrollWidth } = await profileText.evaluate((el) => ({
    offsetWidth: (el as HTMLElement).offsetWidth,
    scrollWidth: el.scrollWidth,
  }));
  expect(scrollWidth).toBeGreaterThan(offsetWidth); // text is clipped
  expect(offsetWidth).toBeGreaterThan(0); // still visible

  // The hamburger should still be clickable to close the menu
  await page.locator("#hamburger-link").click({ force: false });
  await expect(page.locator("#menu-container")).not.toHaveClass(/visible/);
});

test("duplicate profile name shows alert", async ({ page }) => {
  let alertFired = false;
  page.on("dialog", async (dialog) => {
    if (dialog.message().includes("already exists")) {
      alertFired = true;
    }
    await dialog.dismiss();
  });

  // Create first profile
  await createProfile(page, "Duplicate");

  // Try to create another with the same name
  await openProfilePanel(page);
  await page.locator("#profile-switcher .switcher-add").click();
  await page.locator("#profile_name_setting").fill("Duplicate");
  await page
    .locator("input[name='profile_icon_selector'][value='fa-truck']")
    .check();
  await page.locator("#add-user-button").click();

  expect(alertFired).toBe(true);
});
