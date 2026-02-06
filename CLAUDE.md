# BSharp: Perfect Pitch Trainer

Rebuilt from [pganssle/cim](https://github.com/pganssle/cim) (Chord Identification Method Trainer). The original CIM source lives at `~/dev/cim`.

## Architecture

- **Frontend**: TypeScript + HTML, bundled with esbuild into a single `bsharp.js` IIFE
- **Styling**: SCSS compiled with sass CLI. Uses Fork Awesome for icons
- **Android**: WebView wrapper in Kotlin (`android/` directory)
- **Audio**: Pre-generated MP3 chord files only (42 files in `static/chords/`). No Tone.js

## Build

```bash
npm install          # First time only
make build           # esbuild + sass + copy to dist/
make check           # TypeScript type checking (tsc --noEmit)
make android-deploy  # Build + copy dist/ to android assets
make clean           # Remove dist/
```

## Project Structure

```
src/
  index.html         # Main HTML (hardcoded flags, selectors, SVG clip paths)
  ts/
    main.ts          # Entry point, DOMContentLoaded, window function exposure
    types.ts         # TypeScript interfaces
    data.ts          # Chord definitions, audio file list, note computations
    utils.ts         # Math helpers, formatting, timestamps
    state.ts         # localStorage, profiles, session history
    stats.ts         # Confusion matrix, adaptive weighting algorithm
    audio.ts         # MP3 playback via <audio> elements
    game.ts          # Game flow: chord selection, flag tapping, play/next
    ui.ts            # DOM manipulation, modals, profile UI, settings
    session_cleanup.ts # Session history cleanup on startup
  scss/
    style.scss       # Entry: imports fork-awesome, theme, cim, note-shapes
    _variables.scss  # Color/theme variables
    _theme.scss      # Typography, base layout, theme toggle
    _cim.scss        # Main app styles (flags, controls, modals, colors)
    _note-shapes.scss # Note-to-geometric-shape CSS (clip paths)
    css/
      fork-awesome.css  # Icon font CSS (font paths point to static/fonts/)
static/
  chords/            # 42 pre-generated chord MP3s
  fonts/             # Fork Awesome font files (woff2, woff, ttf, eot, svg)
android/             # Android WebView wrapper project
```

## Key Design Decisions

- **Circular dependency**: `ui.ts` and `game.ts` have circular deps, broken via `registerGameCallbacks()` called in `main.ts`
- **Window exposure**: Functions are assigned to `window` in `main.ts` for `onclick` HTML attributes
- **localStorage keys**: `bsharp_state` / `bsharp_session_history` with migration from old `cim_*` keys
- **Single note trainer**: Code present but feature disabled (requires Tone.js or pre-generated note files)
- **Instrument selector**: Removed from UI (only one instrument: pre-generated piano)

## Chord Data

14 chords, ordered: red, yellow, blue, black, green, orange, purple, pink, brown | gray, tan, lightgreen, lightpurple, skyblue. First 9 are "white chords", last 5 are "black chords" (FIRST_BLACK_INDEX = 9).

## Testing

Tests exist to protect behavior, not to increase coverage or test count. Follow the Google testing philosophy.

**What TO test:**
- Calculations and algorithms (adaptive weighting in `stats.ts`, cumulative sums, coefficient math)
- Edge cases: zero inputs, empty arrays, boundary conditions, missing/undefined fields
- Complex transformations: multi-step logic, non-obvious behavior
- Data integrity: chord definitions are consistent, audio file lists match expected patterns

**What NOT to test:**
- Don't test implementation details — test behavior, not methods
- Don't test trivial control flow or simple conditionals
- Don't create identity tests (output equals input with no transformation)
- Don't create redundant tests — if two functions share the same logic, test it once
- Don't test browser/DOM APIs or localStorage directly — trust the platform
- Don't re-implement the code under test in the assertion

**Use TDD when building or changing features.** Write or update both unit and UI tests first to capture the expected behavior, then implement the code to make them pass. Run `make test-unit` to verify.

**Review and delete useless tests.** When new tests are written, review them critically. If a test re-implements the code under test, delete it. If a test would break during a refactor without a behavior change, delete it.

## Conventions

- Use brief commit messages (one line, no body). Do not add Co-Authored-By trailers
- After any code change, run `make android-deploy` to sync dist/ into the Android assets

## TODO

- Pending items are tracked in TODO.md. Read these at the beginning of a session. Update the TODO.md (delete any finished items, add any new pending items) before commits if relevant. 

## Attribution

Licensed Apache 2.0. Original work by Paul Ganssle. See NOTICE file.
