import { expect, Page } from "@playwright/test";

/** Open the hamburger menu (required on mobile viewport). */
export async function openMenu(page: Page): Promise<void> {
  const menu = page.locator("#menu-container");
  const isOpen = await menu.evaluate((el) =>
    el.classList.contains("visible"),
  );
  if (!isOpen) {
    await page.locator("#hamburger-link").click();
    await expect(menu).toHaveClass(/visible/);
  }
}

/** Open the profile panel via the hamburger menu. */
export async function openProfilePanel(page: Page): Promise<void> {
  await openMenu(page);
  await page.locator("#profile-infobox-trigger").click();
  await expect(page.locator("#profile-info-container")).toHaveClass(/visible/);
}

/** Create a new profile with the given name and optional icon.
 *  Closes the menu afterward so the page is in a clean state. */
export async function createProfile(
  page: Page,
  name: string,
  icon = "fa-bolt",
): Promise<void> {
  await openProfilePanel(page);
  await page.locator("#profile-switcher .switcher-add").click();
  await page.locator("#profile_name_setting").fill(name);
  await page
    .locator(`input[name='profile_icon_selector'][value='${icon}']`)
    .check();
  await page.locator("#add-user-button").click();
  // Close expansion bar so subsequent interactions start from a clean state
  await closeMenu(page);
}

/** Close the hamburger menu if it's open. */
export async function closeMenu(page: Page): Promise<void> {
  const menu = page.locator("#menu-container");
  const isOpen = await menu.evaluate((el) =>
    el.classList.contains("visible"),
  );
  if (isOpen) {
    await page.locator("#hamburger-link").click({ force: true });
    await expect(menu).not.toHaveClass(/visible/);
  }
}

/** Set up a pageerror listener and return the collected errors array. */
export function collectJsErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}
