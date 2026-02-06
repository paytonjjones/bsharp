import { test, expect } from "@playwright/test";
import { openMenu } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

test("hamburger toggles expansion bar", async ({ page }) => {
  const menu = page.locator("#menu-container");
  await expect(menu).not.toHaveClass(/visible/);

  await page.locator("#hamburger-link").click();
  await expect(menu).toHaveClass(/visible/);

  await page.locator("#hamburger-link").click();
  await expect(menu).not.toHaveClass(/visible/);
});

test("opening a panel adds panel-open to container", async ({ page }) => {
  await openMenu(page);
  await page.locator("#i-infobox-trigger").click();

  await expect(page.locator(".cim-container")).toHaveClass(/panel-open/);
});

test("home button closes open panel", async ({ page }) => {
  await openMenu(page);
  await page.locator("#i-infobox-trigger").click();
  await expect(page.locator("#i-infobox")).toHaveClass(/visible/);

  await page.locator("#home-button a").click();
  await expect(page.locator("#i-infobox")).not.toHaveClass(/visible/);
  await expect(page.locator(".cim-container")).not.toHaveClass(/panel-open/);
});

test("opening second panel closes first", async ({ page }) => {
  await openMenu(page);

  // Open info panel
  await page.locator("#i-infobox-trigger").click();
  await expect(page.locator("#i-infobox")).toHaveClass(/visible/);

  // Open trainer panel
  await page.locator("#trainer-infobox-trigger").click();
  await expect(page.locator("#trainer-infobox")).toHaveClass(/visible/);
  await expect(page.locator("#i-infobox")).not.toHaveClass(/visible/);
});

test("active trigger highlighted when panel open", async ({ page }) => {
  await openMenu(page);
  await page.locator("#profile-infobox-trigger").click();

  // The trigger's parent .infobox-container should have .active
  const triggerParent = page.locator(
    "#profile-infobox-trigger",
  ).locator("..");
  await expect(triggerParent).toHaveClass(/active/);
});

test("closing panel highlights home button", async ({ page }) => {
  await openMenu(page);
  await page.locator("#i-infobox-trigger").click();
  await expect(page.locator("#i-infobox")).toHaveClass(/visible/);

  // Close via home
  await page.locator("#home-button a").click();

  await expect(page.locator("#home-button")).toHaveClass(/active/);
});
