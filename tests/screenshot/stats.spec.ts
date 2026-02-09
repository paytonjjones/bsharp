import { test, expect } from "@playwright/test";
import { openMenu } from "../ui/helpers";

test.beforeEach(async ({ page }) => {
  const now = Date.now() / 1000;

  await page.addInitScript(
    (timestamp) => {
      localStorage.clear();
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
            persist_reaction_face: true,
            enable_onboarding_hints: false,
            color_scheme: "dark",
            stats: {
              current_chord: "yellow",
              start_time: timestamp,
              updated_time: timestamp,
              correct: 23,
              identifications: 25,
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
              start_time: timestamp - 86400,
              updated_time: timestamp - 86300,
              correct: 20,
              identifications: 25,
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
              correct: 23,
              identifications: 25,
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
});

test("stats done state layout", async ({ page }) => {
  await expect(page.locator("#stats-container")).toHaveClass(/done/);
  await expect(page.locator("#stats-container")).toHaveScreenshot(
    "stats-done.png",
  );
});

test("stats history item layout", async ({ page }) => {
  await openMenu(page);
  await page.locator("#stats-history-trigger").click();
  await expect(page.locator("#stats-history-container")).toHaveClass(/visible/);

  const items = page.locator(".stats-history-item");
  await expect(items).toHaveCount(2);

  await expect(page.locator("#stats-history-container")).toHaveScreenshot(
    "stats-history.png",
  );
});
