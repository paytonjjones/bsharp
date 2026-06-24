import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCommandOnPath } from '../audio/ffmpeg.ts';
import { readChordDefinitions } from '../audio/chord-definitions.ts';
import { buildChordAssets, type ChordMixVariant } from '../audio/chord-mix.ts';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const DATA_PATH = path.join(REPO_ROOT, 'src/ts/data.ts');
const SOURCE_NOTE_DIR = path.join(REPO_ROOT, 'static/notes/guitar');
const ARTIFACTS_DIR = path.join(SCRIPT_DIR, 'artifacts/chords');
const MANIFEST_PATH = path.join(ARTIFACTS_DIR, 'manifest.json');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'report.md');
const TARGET_DURATION_SEC = 2.0;
const FADE_OUT_SEC = 0.06;
const OUTPUT_BITRATE = '128k';
const COMMAND = 'npm run build:guitar-chords';

const VARIANTS: ChordMixVariant[] = [
    {
        name: 'guitar',
        description: 'Guitar chord mix with aligned note starts, EBU loudness normalization, and limiting.',
        outputDir: path.join(REPO_ROOT, 'static/chords/guitar'),
        perInputFilters: ['volume=0.72'],
        inputDelayStepMs: 0,
        amixOptions: ['inputs=3', 'duration=longest', 'normalize=0'],
        postMixFilters: ['loudnorm=I=-18:TP=-1.5:LRA=11', 'alimiter=limit=0.95'],
    },
    {
        name: 'guitar-strummed',
        description: 'Guitar chord mix with note starts intentionally staggered low-to-high by 100 ms per note.',
        outputDir: path.join(REPO_ROOT, 'static/chords/guitar-strummed'),
        perInputFilters: ['volume=0.72'],
        inputDelayStepMs: 100,
        amixOptions: ['inputs=3', 'duration=longest', 'normalize=0'],
        postMixFilters: ['loudnorm=I=-18:TP=-1.5:LRA=11', 'alimiter=limit=0.95'],
    },
];

async function buildAll(): Promise<void> {
    assertCommandOnPath('ffmpeg');
    assertCommandOnPath('ffprobe');
    mkdirSync(ARTIFACTS_DIR, { recursive: true });

    const entries = buildChordAssets({
        repoRoot: REPO_ROOT,
        command: COMMAND,
        sourceNoteDir: SOURCE_NOTE_DIR,
        manifestPath: MANIFEST_PATH,
        reportPath: REPORT_PATH,
        targetDurationSec: TARGET_DURATION_SEC,
        fadeOutSec: FADE_OUT_SEC,
        outputBitrate: OUTPUT_BITRATE,
        chords: readChordDefinitions(DATA_PATH),
        variants: VARIANTS,
    });

    console.log(`Generated ${entries.length} guitar chord assets.`);
    console.log(`Wrote ${path.relative(REPO_ROOT, MANIFEST_PATH)} and ${path.relative(REPO_ROOT, REPORT_PATH)}.`);
}

buildAll().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
