import { test, expect } from "@playwright/test";
import { openMenu } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

test("empty history shows meaningful message", async ({ page }) => {
  await openMenu(page);
  await page.locator("#stats-history-trigger").click();

  const statsContainer = page.locator("#stats-history-container");
  await expect(statsContainer).toHaveClass(/visible/);

  // Should have reasonable size (not a tiny empty box)
  const box = await statsContainer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThan(30);

  // Should have text content (e.g. "No sessions recorded yet.")
  const text = await statsContainer.textContent();
  expect(text!.trim().length).toBeGreaterThan(0);
});

test("history populates with session data", async ({ page }) => {
  const now = Date.now() / 1000;

  // Pre-populate localStorage with session history before page loads
  await page.addInitScript(
    (timestamp) => {
      const state = {
        profiles: {
          100: {
            id: 100,
            name: "Guest",
            icon: "fa-user",
            target_number: 25,
            show_chord_mode: "black_only",
            reveal_chord_mode: "always",
            chord_display_mode: "shapes_and_letters",
            single_note_mode: "white_only_on_black",
            single_note_correctness_mode: "only_correct",
            persist_reaction_face: false,
            stats: {
              current_chord: "yellow",
              start_time: timestamp,
              updated_time: timestamp,
              correct: 0,
              identifications: 0,
              confusion_matrix: {},
              notes: { correct: 0, identifications: 0, confusion_matrix: {} },
              done: false,
            },
            current_chord: "yellow",
            current_instrument: "piano_1",
          },
        },
        current_chord: "yellow",
        current_profile: 100,
      };
      localStorage.setItem("bsharp_state", JSON.stringify(state));

      const history = {
        "100": {
          yellow: [
            {
              current_chord: "yellow",
              start_time: timestamp - 3600,
              updated_time: timestamp - 3500,
              correct: 8,
              identifications: 10,
              confusion_matrix: {},
              notes: {
                correct: 0,
                identifications: 0,
                confusion_matrix: {},
              },
              done: true,
            },
          ],
        },
      };
      localStorage.setItem("bsharp_session_history", JSON.stringify(history));
    },
    now,
  );

  // Navigate again to pick up the seeded data
  await page.goto("/");

  await openMenu(page);
  await page.locator("#stats-history-trigger").click();

  const statsContainer = page.locator("#stats-history-container");
  await expect(statsContainer).toHaveClass(/visible/);
  await expect(statsContainer.locator(".stats-history-item")).toHaveCount(1);
});

test("entries sorted newest first", async ({ page }) => {
  const now = Date.now() / 1000;

  await page.addInitScript(
    (timestamp) => {
      const state = {
        profiles: {
          100: {
            id: 100,
            name: "Guest",
            icon: "fa-user",
            target_number: 25,
            show_chord_mode: "black_only",
            reveal_chord_mode: "always",
            chord_display_mode: "shapes_and_letters",
            single_note_mode: "white_only_on_black",
            single_note_correctness_mode: "only_correct",
            persist_reaction_face: false,
            stats: {
              current_chord: "yellow",
              start_time: timestamp,
              updated_time: timestamp,
              correct: 0,
              identifications: 0,
              confusion_matrix: {},
              notes: { correct: 0, identifications: 0, confusion_matrix: {} },
              done: false,
            },
            current_chord: "yellow",
            current_instrument: "piano_1",
          },
        },
        current_chord: "yellow",
        current_profile: 100,
      };
      localStorage.setItem("bsharp_state", JSON.stringify(state));

      const history = {
        "100": {
          yellow: [
            {
              current_chord: "yellow",
              start_time: timestamp - 7200,
              updated_time: timestamp - 7100,
              correct: 5,
              identifications: 10,
              confusion_matrix: {},
              notes: {
                correct: 0,
                identifications: 0,
                confusion_matrix: {},
              },
              done: true,
            },
            {
              current_chord: "yellow",
              start_time: timestamp - 3600,
              updated_time: timestamp - 3500,
              correct: 9,
              identifications: 10,
              confusion_matrix: {},
              notes: {
                correct: 0,
                identifications: 0,
                confusion_matrix: {},
              },
              done: true,
            },
          ],
        },
      };
      localStorage.setItem("bsharp_session_history", JSON.stringify(history));
    },
    now,
  );

  await page.goto("/");

  await openMenu(page);
  await page.locator("#stats-history-trigger").click();

  const items = page.locator(
    "#stats-history-container .stats-history-item .session-stats",
  );
  await expect(items).toHaveCount(2);

  // Newer session (9/10) should appear first
  const firstText = await items.first().textContent();
  const secondText = await items.last().textContent();
  expect(firstText).toContain("9 / 10");
  expect(secondText).toContain("5 / 10");
});
