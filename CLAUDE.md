# BSharp: Perfect Pitch Trainer

Rebuilt from [pganssle/cim](https://github.com/pganssle/cim) (Chord Identification Method Trainer). The original CIM source lives at `~/dev/cim`.

## Architecture

- **Build**: Vite bundles the app into a folder of static assets in `dist/` (a single `index.html` plus hashed JS/CSS and audio/font assets referenced via `<script src>` / `<link href>`)
- **Frontend**: TypeScript core logic + HTML. Reactive UI shell (menu / panels) uses Alpine.js; styling uses Tailwind CSS alongside bespoke flag/note-shape CSS. Fork Awesome for icons
- **Audio**: Pre-generated MP3 chord files only (42 files in `static/chords/`), imported through Vite (`audio_assets.ts`). No Tone.js
- **Single-page web app**: no Android / native wrapper

## Build

```bash
npm install          # First time only
make build           # vite build -> dist/ (or: npm run build)
make dev             # vite dev server with hot reload
make check           # TypeScript type checking (tsc --noEmit)
make clean           # Remove dist/
```

## Project Structure

```
src/
  index.html         # Main HTML, Vite entry (flags, selectors, SVG clip paths, Alpine bindings)
  style.css          # Tailwind import + ported component styles + note shapes
  fork-awesome.css   # Icon font CSS (@font-face -> ./forkawesome-webfont.woff2)
  forkawesome-webfont.woff2  # Icon font (inlined into the build by Vite)
  ts/
    main.ts          # Entry point: registers Alpine ui store, exposes window funcs, init()
    ui_store.ts      # Typed accessor + types for the Alpine `ui` store (menu/panel state)
    types.ts         # TypeScript interfaces
    data.ts          # Chord definitions, audio file list, note computations
    utils.ts         # Math helpers, formatting, timestamps
    state.ts         # localStorage, profiles, session history
    stats.ts         # Confusion matrix, adaptive weighting algorithm
    audio.ts         # MP3 playback via <audio> elements
    audio_assets.ts  # import.meta.glob map of chord MP3s -> bundled URLs
    game.ts          # Game flow: chord selection, flag tapping, play/next
    ui.ts            # DOM manipulation, profile UI, settings, stats display
    session_cleanup.ts # Session history cleanup on startup
static/
  chords/            # 42 pre-generated chord MP3s
  notes/             # Single-note MP3s (feature disabled)
vite.config.ts       # Vite + @tailwindcss/vite config (root: src, outDir: ../dist)
```

## Key Design Decisions

- **Reactive shell via Alpine**: menu open/close, panel switching and active-tab state live in an Alpine store (`Alpine.store('ui')`, registered in `main.ts`). The HTML binds `$store.ui.*` with `:class`, so the old class-based contract (`#menu-container.visible`, `.cim-container.panel-open`, panel `.visible`, `.infobox-container.active`) is preserved. Imperative TS reaches the store via `getUiStore()` (`ui_store.ts`).
- **Circular dependency**: `ui.ts` and `game.ts` have circular deps, broken via `registerGameCallbacks()` called in `main.ts`
- **Window exposure**: Game/profile actions are assigned to `window` in `main.ts` for `onclick` HTML attributes
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

**Screenshot tests** live in `tests/screenshot/` and use Playwright's `toHaveScreenshot()`. Snapshots are generated per-platform in `*-snapshots/` directories and are gitignored — they must be regenerated locally with `make test-screenshot-update`. Use `__bsharp_test_deterministic_color` to force a known chord color for deterministic screenshots.

**Use TDD when building or changing features.** Write or update both unit and UI tests first to capture the expected behavior, then implement the code to make them pass. Run `make test-unit` to verify.

**Review and delete useless tests.** When new tests are written, review them critically. If a test re-implements the code under test, delete it. If a test would break during a refactor without a behavior change, delete it.

## Conventions

- Use brief commit messages (one line, no body). Do not add Co-Authored-By trailers
- After any code change, run `make build` to verify the static build succeeds

## Releases

When bumping the version for a release:
1. Tag the commit: `git tag v<version>` (e.g. `git tag v1.2`)
2. Build the static site: `make build` (output in `dist/`) and deploy it to the static host
3. Generate release notes from commits since the last tag: `git log --oneline <prev-tag>..HEAD`
4. Keep release notes short (max 500 chars / ~5 lines)
5. Release notes go in CHANGELOG.md — append a new section at the top with the version, date, and notes

## TODO

- Pending items are tracked in TODO.md. Read these at the beginning of a session. Update the TODO.md (delete any finished items, add any new pending items) before commits if relevant. 

## Attribution

Licensed Apache 2.0. Original work by Paul Ganssle. See NOTICE file.
