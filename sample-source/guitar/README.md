# Guitar Sample Extraction

This directory contains the repeatable, build-time-only pipeline for extracting
single-note guitar samples from University of Iowa Musical Instrument Samples
range files. The generated app assets are written to `static/notes/guitar/`, but
the app does not load them yet. Guitar chord assets are generated from those
note assets into `static/chords/guitar/` and `static/chords/guitar-strummed/`.

## Raw Source Files

Place the University of Iowa MIS guitar AIFF files in:

```text
sample-source/guitar/raw/
```

The raw files are intentionally gitignored and must not be committed. Expected
filenames look like:

```text
Guitar.mf.sulA.A2B2.aif
Guitar.mf.sulD.C4Ab4.aif
Guitar.mf.sulB.B3.aif
Guitar.mf.sul_E.C5B5.aif
```

The parser supports `pp`, `mf`, and `ff` dynamics, but this first pass only
selects `mf` files. The `sul_E` string name is the high E string; `sulE` is the
low E string. Source files come from the University of Iowa Electronic Music
Studios Musical Instrument Samples collection:

https://theremin.music.uiowa.edu/mis.html

## Required Local Tools

- Node 24 or newer, which can run this standalone TypeScript script directly.
- `ffmpeg` and `ffprobe` on `PATH`.

On macOS:

```sh
brew install ffmpeg
```

## Regenerate Outputs

From the repository root:

```sh
npm run build:guitar-samples
```

The command:

- Derives target pitches from existing piano note assets in `static/notes/piano/`.
- Parses local range AIFF files in `sample-source/guitar/raw/`.
- Selects exact MIDI matches from `mf` files using lowest guitar fret.
- Segments each selected range file into note events.
- Measures extracted pitch, applies pitch correction with ffmpeg's `rubberband`
  filter when needed, then validates the final MP3 against A4=440 equal
  temperament.
- Writes accepted MP3 samples to `static/notes/guitar/`.
- Regenerates `artifacts/samples/manifest.json` and `artifacts/samples/report.md`.

For mapping-only validation without writing outputs:

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON sample-source/guitar/build-guitar-samples.ts --dry-run
```

To regenerate guitar chord assets from the generated note samples:

```sh
npm run build:guitar-chords
```

The chord command:

- Reads `CHORD_DEFINITIONS` from `src/ts/data.ts`.
- Mixes matching `static/notes/guitar/{note}_medium.mp3` files with ffmpeg.
- Writes simultaneous guitar chords to `static/chords/guitar/`.
- Writes low-to-high strummed guitar chords to `static/chords/guitar-strummed/`.
- Regenerates `artifacts/chords/manifest.json` and `artifacts/chords/report.md`.
