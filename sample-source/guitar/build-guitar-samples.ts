import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Pitchfinder from 'pitchfinder';

type Dynamic = 'pp' | 'mf' | 'ff';
type GuitarString = 'sulE' | 'sulA' | 'sulD' | 'sulG' | 'sulB' | 'sul_E';
type Status = 'pass' | 'warn' | 'fail' | 'missing';

interface SourceFileInfo {
    filename: string;
    filePath: string;
    dynamic: Dynamic;
    guitarString: GuitarString;
    sourceRangeStart: string;
    sourceRangeEnd: string;
    startMidi: number;
    endMidi: number;
    range: string[];
}

interface Candidate {
    source: SourceFileInfo;
    midi: number;
    noteName: string;
    sourceRangeIndex: number;
    fret: number;
}

interface TargetNote {
    outputNoteName: string;
    noteName: string;
    midi: number;
    expectedHz: number;
}

interface WavData {
    sampleRate: number;
    samples: Float32Array;
}

interface Region {
    startSec: number;
    endSec: number;
    peakRms: number;
}

interface PitchMethodMeasurement {
    yinHz: number | null;
    amdfHz: number | null;
}

interface ManifestEntry {
    outputNoteName: string;
    midi: number;
    expectedHz: number;
    preCorrectionYinHz: number | null;
    preCorrectionYinCentsError: number | null;
    preCorrectionAmdfHz: number | null;
    preCorrectionAmdfCentsError: number | null;
    preCorrectionMethodAgreementCents: number | null;
    preCorrectionMeasuredHz: number | null;
    preCorrectionCentsError: number | null;
    pitchCorrectionCents: number | null;
    finalYinHz: number | null;
    finalYinCentsError: number | null;
    finalAmdfHz: number | null;
    finalAmdfCentsError: number | null;
    finalMethodAgreementCents: number | null;
    measuredHz: number | null;
    centsError: number | null;
    status: Status;
    sourceFile: string | null;
    sourceRangeStart: string | null;
    sourceRangeEnd: string | null;
    sourceRangeIndex: number | null;
    guitarString: GuitarString | null;
    fret: number | null;
    detectedRegionStartSec: number | null;
    detectedRegionEndSec: number | null;
    segmentStartSec: number | null;
    segmentEndSec: number | null;
    fixedSegmentDurationSec: number | null;
    sourceDurationSec: number | null;
    nextRegionStartSec: number | null;
    rejectedForNextRegion: boolean;
    rejectedForShortSource: boolean;
    targetOnsetOffsetSec: number | null;
    preAlignmentOnsetOffsetSec: number | null;
    onsetAlignmentShiftSec: number | null;
    measuredDurationSec: number | null;
    onsetOffsetSec: number | null;
    onsetStatus: Status | null;
    validationMessage: string | null;
    outputFile: string | null;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RAW_DIR = path.join(SCRIPT_DIR, 'raw');
const NOTES_DIR = path.join(REPO_ROOT, 'static/notes');
const PIANO_NOTES_DIR = path.join(NOTES_DIR, 'piano');
const OUTPUT_DIR = path.join(NOTES_DIR, 'guitar');
const ARTIFACTS_DIR = path.join(SCRIPT_DIR, 'artifacts/samples');
const MANIFEST_PATH = path.join(ARTIFACTS_DIR, 'manifest.json');
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'report.md');
const COMMAND = 'npm run build:guitar-samples';
const OUTPUT_EXT = 'mp3';
const MEDIUM_SUFFIX = 'medium';
const FIXED_SEGMENT_DURATION_SEC = 2.0;
const SEGMENT_PREROLL_SEC = 0.035;
const TARGET_ONSET_OFFSET_SEC = 0.05;
const ONSET_EARLY_WARNING_SEC = 0.015;
const ONSET_LATE_WARNING_SEC = 0.07;
const SOURCE_END_TOLERANCE_SEC = 0.0005;
const DURATION_TOLERANCE_SEC = 0.025;

const NOTE_BASE_TO_SEMITONE: Record<string, number> = {
    C: 0, 'C#': 1, Db: 1,
    D: 2, 'D#': 3, Eb: 3,
    E: 4,
    F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8,
    A: 9, 'A#': 10, Bb: 10,
    B: 11,
};

const CANONICAL_SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STRING_OPEN_MIDI: Record<GuitarString, number> = {
    sulE: noteNameToMidi('E2'),
    sulA: noteNameToMidi('A2'),
    sulD: noteNameToMidi('D3'),
    sulG: noteNameToMidi('G3'),
    sulB: noteNameToMidi('B3'),
    sul_E: noteNameToMidi('E4'),
};
const STRING_TIE_BREAK_ORDER: Record<GuitarString, number> = {
    sulE: 0,
    sulA: 1,
    sulD: 2,
    sulG: 3,
    sulB: 4,
    sul_E: 5,
};

export function noteNameToMidi(noteName: string): number {
    const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(noteName);
    if (!match) {
        throw new Error(`Invalid note name: ${noteName}`);
    }

    const semitone = NOTE_BASE_TO_SEMITONE[match[1]];
    if (semitone === undefined) {
        throw new Error(`Unsupported note spelling: ${noteName}`);
    }

    const octave = Number(match[2]);
    return (octave + 1) * 12 + semitone;
}

export function midiToNoteName(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    return `${CANONICAL_SHARP_NOTES[midi % 12]}${octave}`;
}

export function expectedHzForMidi(midi: number): number {
    return 440 * (2 ** ((midi - 69) / 12));
}

export function centsError(measuredHz: number, expectedHz: number): number {
    return 1200 * Math.log2(measuredHz / expectedHz);
}

export function parseGuitarFilename(filename: string, rawDir = RAW_DIR): SourceFileInfo | null {
    const match = /^Guitar\.(pp|mf|ff)\.(sul_E|sul[EDAGB])\.([A-G](?:#|b)?\d)(?:([A-G](?:#|b)?\d))?\.aiff?$/i.exec(filename);
    if (!match) {
        return null;
    }

    const dynamic = match[1].toLowerCase() as Dynamic;
    const guitarString = match[2] as GuitarString;
    const sourceRangeStart = match[3];
    const sourceRangeEnd = match[4] ?? sourceRangeStart;
    const range = expandChromaticRange(sourceRangeStart, sourceRangeEnd);

    return {
        filename,
        filePath: path.join(rawDir, filename),
        dynamic,
        guitarString,
        sourceRangeStart,
        sourceRangeEnd,
        startMidi: noteNameToMidi(sourceRangeStart),
        endMidi: noteNameToMidi(sourceRangeEnd),
        range,
    };
}

export function expandChromaticRange(startNote: string, endNote: string): string[] {
    const startMidi = noteNameToMidi(startNote);
    const endMidi = noteNameToMidi(endNote);
    if (endMidi < startMidi) {
        throw new Error(`Descending ranges are not supported: ${startNote}${endNote}`);
    }

    const notes: string[] = [];
    for (let midi = startMidi; midi <= endMidi; midi += 1) {
        notes.push(midiToNoteName(midi));
    }
    return notes;
}

export function guitarFret(guitarString: GuitarString, midi: number): number | null {
    const fret = midi - STRING_OPEN_MIDI[guitarString];
    return fret >= 0 ? fret : null;
}

export function selectLowestFretCandidate(candidates: Candidate[]): Candidate | null {
    if (candidates.length === 0) {
        return null;
    }

    return [...candidates].sort((a, b) => {
        return a.fret - b.fret
            || STRING_TIE_BREAK_ORDER[a.source.guitarString] - STRING_TIE_BREAK_ORDER[b.source.guitarString]
            || a.source.startMidi - b.source.startMidi
            || a.source.filename.localeCompare(b.source.filename);
    })[0];
}

function pianoPrefixToNoteName(prefix: string): string {
    const match = /^([a-g](?:s)?|h)(-?\d+)$/i.exec(prefix);
    if (!match) {
        throw new Error(`Cannot derive note from piano sample prefix: ${prefix}`);
    }

    const note = match[1].toLowerCase();
    const octave = match[2];
    const noteName = note === 'h'
        ? 'B'
        : note.endsWith('s')
            ? `${note[0].toUpperCase()}#`
            : note.toUpperCase();

    return `${noteName}${octave}`;
}

function deriveTargetNotes(): TargetNote[] {
    const filenames = readdirSync(PIANO_NOTES_DIR).filter((filename) => /^.+_(short|medium|long)\.mp3$/.test(filename));
    const prefixes = [...new Set(filenames.map((filename) => filename.replace(/_(short|medium|long)\.mp3$/, '')))];

    return prefixes.map((outputNoteName) => {
        const noteName = pianoPrefixToNoteName(outputNoteName);
        const midi = noteNameToMidi(noteName);
        return {
            outputNoteName,
            noteName,
            midi,
            expectedHz: expectedHzForMidi(midi),
        };
    }).sort((a, b) => a.midi - b.midi || a.outputNoteName.localeCompare(b.outputNoteName));
}

function discoverSources(): SourceFileInfo[] {
    if (!existsSync(RAW_DIR)) {
        throw new Error(`Raw source directory not found: ${RAW_DIR}`);
    }

    return readdirSync(RAW_DIR)
        .map((filename) => parseGuitarFilename(filename))
        .filter((source): source is SourceFileInfo => source !== null)
        .sort((a, b) => a.filename.localeCompare(b.filename));
}

function selectCandidates(targets: TargetNote[], sources: SourceFileInfo[]): Map<number, Candidate> {
    const mfSources = sources.filter((source) => source.dynamic === 'mf');
    const byMidi = new Map<number, Candidate[]>();

    for (const source of mfSources) {
        source.range.forEach((noteName, sourceRangeIndex) => {
            const midi = source.startMidi + sourceRangeIndex;
            const fret = guitarFret(source.guitarString, midi);
            if (fret === null) {
                return;
            }

            const candidate: Candidate = { source, midi, noteName, sourceRangeIndex, fret };
            const existing = byMidi.get(midi);
            if (existing) {
                existing.push(candidate);
            } else {
                byMidi.set(midi, [candidate]);
            }
        });
    }

    const selected = new Map<number, Candidate>();
    for (const target of targets) {
        const candidate = selectLowestFretCandidate(byMidi.get(target.midi) ?? []);
        if (candidate) {
            selected.set(target.midi, candidate);
        }
    }
    return selected;
}

function assertCommandOnPath(command: string): void {
    const result = spawnSync(command, ['-version'], { encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(`${command} is required on PATH`);
    }
}

function runCommand(command: string, args: string[]): void {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
    }
}

function decodeSourceToWav(source: SourceFileInfo, tempDir: string): string {
    const wavPath = path.join(tempDir, `${source.filename}.wav`);
    runCommand('ffmpeg', [
        '-v', 'error',
        '-y',
        '-i', source.filePath,
        '-ac', '1',
        '-ar', '44100',
        '-c:a', 'pcm_f32le',
        wavPath,
    ]);
    return wavPath;
}

function readWavFloat32(wavPath: string): WavData {
    const buffer = readFileSync(wavPath);
    if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
        throw new Error(`Unsupported WAV file: ${wavPath}`);
    }

    let offset = 12;
    let sampleRate = 0;
    let bitsPerSample = 0;
    let audioFormat = 0;
    let dataStart = -1;
    let dataSize = 0;

    while (offset + 8 <= buffer.length) {
        const chunkId = buffer.toString('ascii', offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);
        const chunkStart = offset + 8;

        if (chunkId === 'fmt ') {
            audioFormat = buffer.readUInt16LE(chunkStart);
            sampleRate = buffer.readUInt32LE(chunkStart + 4);
            bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
        } else if (chunkId === 'data') {
            dataStart = chunkStart;
            dataSize = chunkSize;
            break;
        }

        offset = chunkStart + chunkSize + (chunkSize % 2);
    }

    if (dataStart < 0 || sampleRate <= 0) {
        throw new Error(`WAV is missing required chunks: ${wavPath}`);
    }

    if (audioFormat !== 3 || bitsPerSample !== 32) {
        throw new Error(`Expected 32-bit float WAV, got format ${audioFormat}, ${bitsPerSample} bits`);
    }

    const sampleCount = dataSize / 4;
    const samples = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i += 1) {
        samples[i] = buffer.readFloatLE(dataStart + i * 4);
    }

    return { sampleRate, samples };
}

function detectRegions(wav: WavData, expectedCount: number): Region[] {
    const windowSize = Math.max(1, Math.round(wav.sampleRate * 0.02));
    const hopSize = Math.max(1, Math.round(wav.sampleRate * 0.01));
    const rmsFrames: number[] = [];

    for (let start = 0; start + windowSize <= wav.samples.length; start += hopSize) {
        let sum = 0;
        for (let i = start; i < start + windowSize; i += 1) {
            sum += wav.samples[i] * wav.samples[i];
        }
        rmsFrames.push(Math.sqrt(sum / windowSize));
    }

    const sortedRms = [...rmsFrames].sort((a, b) => a - b);
    const percentile = (p: number) => sortedRms[Math.min(sortedRms.length - 1, Math.floor(sortedRms.length * p))] ?? 0;
    const noiseFloor = percentile(0.1);
    const peakRms = sortedRms[sortedRms.length - 1] ?? 0;
    const threshold = Math.max(noiseFloor * 10, peakRms * 0.006, 0.00012);
    const minRegionSec = 0.16;
    const clusterGapSec = 1.2;

    const regions: Region[] = [];
    let activeStartFrame: number | null = null;
    let activePeak = 0;

    rmsFrames.forEach((rms, frameIndex) => {
        const active = rms >= threshold;
        if (active && activeStartFrame === null) {
            activeStartFrame = frameIndex;
            activePeak = rms;
        } else if (active && activeStartFrame !== null) {
            activePeak = Math.max(activePeak, rms);
        } else if (!active && activeStartFrame !== null) {
            const startSec = (activeStartFrame * hopSize) / wav.sampleRate;
            const endSec = ((frameIndex * hopSize) + windowSize) / wav.sampleRate;
            if (endSec - startSec >= minRegionSec) {
                regions.push({ startSec, endSec, peakRms: activePeak });
            }
            activeStartFrame = null;
            activePeak = 0;
        }
    });

    if (activeStartFrame !== null) {
        const startSec = (activeStartFrame * hopSize) / wav.sampleRate;
        const endSec = wav.samples.length / wav.sampleRate;
        if (endSec - startSec >= minRegionSec) {
            regions.push({ startSec, endSec, peakRms: activePeak });
        }
    }

    const durationSec = wav.samples.length / wav.sampleRate;
    const slotSec = durationSec / expectedCount;
    const detectedEvents: Region[] = [];

    for (let index = 0; index < expectedCount; index += 1) {
        const slotStart = index === 0 ? 0 : Math.max(0, (index - 0.45) * slotSec);
        const slotEnd = index === expectedCount - 1 ? durationSec : Math.min(durationSec, (index + 0.75) * slotSec);
        const indexedRegions = regions
            .map((region, regionIndex) => ({ region, regionIndex }))
            .filter(({ region }) => region.startSec < slotEnd && region.endSec > slotStart);

        if (indexedRegions.length === 0) {
            continue;
        }

        const anchor = indexedRegions.sort((a, b) => {
            const aDistance = Math.abs(a.region.startSec - index * slotSec);
            const bDistance = Math.abs(b.region.startSec - index * slotSec);
            return aDistance - bDistance || b.region.peakRms - a.region.peakRms;
        })[0];

        let startIndex = anchor.regionIndex;
        while (
            startIndex > 0
            && regions[startIndex].startSec - regions[startIndex - 1].endSec <= clusterGapSec
            && regions[startIndex - 1].startSec >= slotStart
        ) {
            startIndex -= 1;
        }

        let endIndex = anchor.regionIndex;
        while (
            endIndex + 1 < regions.length
            && regions[endIndex + 1].startSec - regions[endIndex].endSec <= clusterGapSec
            && regions[endIndex + 1].startSec < slotEnd
        ) {
            endIndex += 1;
        }

        detectedEvents.push({
            startSec: regions[startIndex].startSec,
            endSec: regions[endIndex].endSec,
            peakRms: Math.max(...regions.slice(startIndex, endIndex + 1).map((region) => region.peakRms)),
        });
    }

    return detectedEvents.sort((a, b) => a.startSec - b.startSec);
}

function buildRegionDebug(source: SourceFileInfo, regions: Region[]): string {
    const expectedCount = source.range.length;
    const found = regions.map((region, index) => {
        return `${index}: ${region.startSec.toFixed(3)}-${region.endSec.toFixed(3)}s peak=${region.peakRms.toFixed(5)}`;
    }).join('\n');
    return [
        `Detected ${regions.length} events for ${source.filename}; expected ${expectedCount}.`,
        `Encoded range: ${source.range.join(', ')}`,
        found,
    ].join('\n');
}

function segmentBounds(region: Region): { startSec: number; endSec: number } {
    const startSec = Math.max(0, region.startSec - SEGMENT_PREROLL_SEC);
    const endSec = startSec + FIXED_SEGMENT_DURATION_SEC;
    return { startSec, endSec };
}

function exportSegmentToWav(source: SourceFileInfo, outputPath: string, startSec: number, endSec: number): void {
    const duration = endSec - startSec;
    const fadeDuration = Math.min(0.06, Math.max(0.02, duration / 8));
    const fadeStart = Math.max(0, duration - fadeDuration);
    const filter = [
        `atrim=start=${startSec.toFixed(6)}:end=${endSec.toFixed(6)}`,
        'asetpts=PTS-STARTPTS',
        'loudnorm=I=-18:TP=-1.5:LRA=11',
        `afade=t=out:st=${fadeStart.toFixed(6)}:d=${fadeDuration.toFixed(6)}`,
    ].join(',');

    runCommand('ffmpeg', [
        '-v', 'error',
        '-y',
        '-i', source.filePath,
        '-ac', '1',
        '-ar', '44100',
        '-af', filter,
        '-c:a', 'pcm_f32le',
        outputPath,
    ]);
}

function alignWavOnset(inputPath: string, outputPath: string, onsetOffsetSec: number | null): number | null {
    if (onsetOffsetSec === null || !Number.isFinite(onsetOffsetSec)) {
        runCommand('ffmpeg', [
            '-v', 'error',
            '-y',
            '-i', inputPath,
            '-ac', '1',
            '-ar', '44100',
            '-c:a', 'pcm_f32le',
            outputPath,
        ]);
        return null;
    }

    const shiftSec = onsetOffsetSec - TARGET_ONSET_OFFSET_SEC;
    const filters = shiftSec > 0
        ? [
            `atrim=start=${shiftSec.toFixed(6)}`,
            'asetpts=PTS-STARTPTS',
            'apad',
            `atrim=duration=${FIXED_SEGMENT_DURATION_SEC.toFixed(6)}`,
        ]
        : [
            `adelay=${Math.round(Math.abs(shiftSec) * 1000)}:all=1`,
            `atrim=duration=${FIXED_SEGMENT_DURATION_SEC.toFixed(6)}`,
            'asetpts=PTS-STARTPTS',
        ];

    runCommand('ffmpeg', [
        '-v', 'error',
        '-y',
        '-i', inputPath,
        '-ac', '1',
        '-ar', '44100',
        '-af', filters.join(','),
        '-c:a', 'pcm_f32le',
        outputPath,
    ]);

    return shiftSec;
}

function exportCorrectedMp3(inputPath: string, outputPath: string, pitchRatio: number): void {
    const filters: string[] = [];
    if (Math.abs(pitchRatio - 1) > 0.000001) {
        filters.push(`rubberband=pitch=${pitchRatio.toFixed(8)}`);
    }
    filters.push('loudnorm=I=-18:TP=-1.5:LRA=11');

    runCommand('ffmpeg', [
        '-v', 'error',
        '-y',
        '-i', inputPath,
        '-ac', '1',
        '-ar', '44100',
        '-af', filters.join(','),
        '-codec:a', 'libmp3lame',
        '-b:a', '128k',
        outputPath,
    ]);
}

function decodeAudioToWav(inputPath: string, wavPath: string): void {
    runCommand('ffmpeg', [
        '-v', 'error',
        '-y',
        '-i', inputPath,
        '-ac', '1',
        '-ar', '44100',
        '-c:a', 'pcm_f32le',
        wavPath,
    ]);
}

function median(values: number[]): number | null {
    if (values.length === 0) {
        return null;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function isPlausiblePitch(pitch: number | null, expectedHz: number): pitch is number {
    if (pitch === null || !Number.isFinite(pitch) || pitch <= 0) {
        return false;
    }

    const minHz = expectedHz / (2 ** (2 / 12));
    const maxHz = expectedHz * (2 ** (2 / 12));
    return pitch >= minHz && pitch <= maxHz;
}

function measurePitchMethods(wav: WavData, expectedHz: number): PitchMethodMeasurement {
    const startSample = Math.min(wav.samples.length, Math.round(wav.sampleRate * TARGET_ONSET_OFFSET_SEC));
    const windowSize = Math.max(4096, Math.round(wav.sampleRate * 0.12));
    const hopSize = Math.round(wav.sampleRate * 0.04);
    const yin = Pitchfinder.YIN({
        sampleRate: wav.sampleRate,
        threshold: 0.15,
        probabilityThreshold: 0.1,
    });
    const amdf = Pitchfinder.AMDF({
        sampleRate: wav.sampleRate,
        minFrequency: expectedHz / (2 ** (2 / 12)),
        maxFrequency: expectedHz * (2 ** (2 / 12)),
        sensitivity: 0.1,
        ratio: 5,
    });
    const yinMeasured: number[] = [];
    const amdfMeasured: number[] = [];
    let windowsAnalyzed = 0;

    for (let start = startSample; start + windowSize <= wav.samples.length && windowsAnalyzed < 12; start += hopSize) {
        windowsAnalyzed += 1;
        const window = wav.samples.slice(start, start + windowSize);
        const yinPitch = yin(window);
        if (isPlausiblePitch(yinPitch, expectedHz)) {
            yinMeasured.push(yinPitch);
        }

        const amdfPitch = amdf(window);
        if (isPlausiblePitch(amdfPitch, expectedHz)) {
            amdfMeasured.push(amdfPitch);
        }
    }

    const yinHz = median(yinMeasured);
    const amdfHz = median(amdfMeasured);
    return {
        yinHz,
        amdfHz,
    };
}

function measurePitch(outputPath: string, expectedHz: number, tempDir: string): PitchMethodMeasurement {
    const wavPath = path.join(tempDir, `${path.basename(outputPath)}.verify.wav`);
    decodeAudioToWav(outputPath, wavPath);
    const wav = readWavFloat32(wavPath);
    return measurePitchMethods(wav, expectedHz);
}

function measureDuration(outputPath: string, tempDir: string): number {
    const wavPath = path.join(tempDir, `${path.basename(outputPath)}.duration.wav`);
    decodeAudioToWav(outputPath, wavPath);
    const wav = readWavFloat32(wavPath);
    return wav.samples.length / wav.sampleRate;
}

function measureFirstOnset(outputPath: string, tempDir: string): number | null {
    const wavPath = path.join(tempDir, `${path.basename(outputPath)}.onset.wav`);
    decodeAudioToWav(outputPath, wavPath);
    const wav = readWavFloat32(wavPath);
    return detectFirstOnset(wav);
}

function detectFirstOnset(wav: WavData): number | null {
    const windowSize = Math.max(1, Math.round(wav.sampleRate * 0.005));
    const hopSize = Math.max(1, Math.round(wav.sampleRate * 0.001));
    const rmsFrames: number[] = [];

    for (let start = 0; start + windowSize <= wav.samples.length; start += hopSize) {
        let sum = 0;
        for (let i = start; i < start + windowSize; i += 1) {
            sum += wav.samples[i] * wav.samples[i];
        }
        rmsFrames.push(Math.sqrt(sum / windowSize));
    }

    if (rmsFrames.length === 0) {
        return null;
    }

    const sortedRms = [...rmsFrames].sort((a, b) => a - b);
    const percentile = (p: number) => sortedRms[Math.min(sortedRms.length - 1, Math.floor(sortedRms.length * p))] ?? 0;
    const noiseFloor = percentile(0.1);
    const peakRms = sortedRms[sortedRms.length - 1] ?? 0;
    const threshold = Math.max(noiseFloor * 10, peakRms * 0.03, 0.00012);

    const firstIndex = rmsFrames.findIndex((rms) => rms >= threshold);
    return firstIndex < 0 ? null : (firstIndex * hopSize) / wav.sampleRate;
}

function statusForOnset(onsetOffsetSec: number | null): Status {
    if (onsetOffsetSec === null || !Number.isFinite(onsetOffsetSec)) {
        return 'warn';
    }
    if (onsetOffsetSec < ONSET_EARLY_WARNING_SEC || onsetOffsetSec > ONSET_LATE_WARNING_SEC) {
        return 'warn';
    }
    return 'pass';
}

function mergeStatuses(statuses: Status[]): Status {
    if (statuses.includes('fail')) {
        return 'fail';
    }
    if (statuses.includes('missing')) {
        return 'missing';
    }
    if (statuses.includes('warn')) {
        return 'warn';
    }
    return 'pass';
}

function statusForCents(error: number | null): Status {
    if (error === null || !Number.isFinite(error)) {
        return 'fail';
    }
    const absError = Math.abs(error);
    if (absError <= 3) {
        return 'pass';
    }
    if (absError <= 8) {
        return 'warn';
    }
    return 'fail';
}

function roundNumber(value: number | null, digits = 4): number | null {
    if (value === null || !Number.isFinite(value)) {
        return null;
    }
    return Number(value.toFixed(digits));
}

function absoluteDifference(left: number | null, right: number | null): number | null {
    if (left === null || right === null || !Number.isFinite(left) || !Number.isFinite(right)) {
        return null;
    }
    return Math.abs(left - right);
}

function buildMissingEntry(target: TargetNote): ManifestEntry {
    return {
        outputNoteName: target.outputNoteName,
        midi: target.midi,
        expectedHz: roundNumber(target.expectedHz)!,
        preCorrectionYinHz: null,
        preCorrectionYinCentsError: null,
        preCorrectionAmdfHz: null,
        preCorrectionAmdfCentsError: null,
        preCorrectionMethodAgreementCents: null,
        preCorrectionMeasuredHz: null,
        preCorrectionCentsError: null,
        pitchCorrectionCents: null,
        finalYinHz: null,
        finalYinCentsError: null,
        finalAmdfHz: null,
        finalAmdfCentsError: null,
        finalMethodAgreementCents: null,
        measuredHz: null,
        centsError: null,
        status: 'missing',
        sourceFile: null,
        sourceRangeStart: null,
        sourceRangeEnd: null,
        sourceRangeIndex: null,
        guitarString: null,
        fret: null,
        detectedRegionStartSec: null,
        detectedRegionEndSec: null,
        segmentStartSec: null,
        segmentEndSec: null,
        fixedSegmentDurationSec: FIXED_SEGMENT_DURATION_SEC,
        sourceDurationSec: null,
        nextRegionStartSec: null,
        rejectedForNextRegion: false,
        rejectedForShortSource: false,
        targetOnsetOffsetSec: TARGET_ONSET_OFFSET_SEC,
        preAlignmentOnsetOffsetSec: null,
        onsetAlignmentShiftSec: null,
        measuredDurationSec: null,
        onsetOffsetSec: null,
        onsetStatus: null,
        validationMessage: 'No matching mf guitar source was selected for this target note.',
        outputFile: null,
    };
}

function writeManifest(entries: ManifestEntry[]): void {
    writeFileSync(MANIFEST_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

function markdownTableValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).replace(/\|/g, '\\|');
}

function writeReport(entries: ManifestEntry[], targets: TargetNote[]): void {
    const generated = entries.filter((entry) => entry.status === 'pass' || entry.status === 'warn');
    const missing = entries.filter((entry) => entry.status === 'missing');
    const warnings = entries.filter((entry) => entry.status === 'warn');
    const failures = entries.filter((entry) => entry.status === 'fail');
    const tableHeaders = [
        'Note',
        'MIDI',
        'Status',
        'Expected Hz',
        'Source YIN Hz',
        'Source YIN Cents',
        'Source AMDF Hz',
        'Source AMDF Cents',
        'Source Agreement Cents',
        'Source Primary Hz',
        'Source Primary Cents',
        'Correction Cents',
        'Final YIN Hz',
        'Final YIN Cents',
        'Final AMDF Hz',
        'Final AMDF Cents',
        'Final Agreement Cents',
        'Final Primary Hz',
        'Final Primary Cents',
        'Source File',
        'String',
        'Fret',
        'Range Index',
        'Region Start',
        'Region End',
        'Segment Start',
        'Segment End',
        'Fixed Duration',
        'Source Duration',
        'Next Region Start',
        'Rejected Next Region',
        'Rejected Short Source',
        'Target Onset',
        'Pre-Alignment Onset',
        'Onset Shift',
        'Measured Duration',
        'Onset Offset',
        'Onset Status',
        'Validation Message',
        'Output File',
    ];
    const numericColumns = new Set([
        'MIDI',
        'Expected Hz',
        'Source YIN Hz',
        'Source YIN Cents',
        'Source AMDF Hz',
        'Source AMDF Cents',
        'Source Agreement Cents',
        'Source Primary Hz',
        'Source Primary Cents',
        'Correction Cents',
        'Final YIN Hz',
        'Final YIN Cents',
        'Final AMDF Hz',
        'Final AMDF Cents',
        'Final Agreement Cents',
        'Final Primary Hz',
        'Final Primary Cents',
        'Fret',
        'Range Index',
        'Region Start',
        'Region End',
        'Segment Start',
        'Segment End',
        'Fixed Duration',
        'Source Duration',
        'Next Region Start',
        'Target Onset',
        'Pre-Alignment Onset',
        'Onset Shift',
        'Measured Duration',
        'Onset Offset',
    ]);
    const tableDivider = tableHeaders.map((header) => numericColumns.has(header) ? '---:' : '---');

    const rows = entries.map((entry) => {
        const values = [
            entry.outputNoteName,
            entry.midi,
            entry.status,
            entry.expectedHz,
            entry.preCorrectionYinHz,
            entry.preCorrectionYinCentsError,
            entry.preCorrectionAmdfHz,
            entry.preCorrectionAmdfCentsError,
            entry.preCorrectionMethodAgreementCents,
            entry.preCorrectionMeasuredHz,
            entry.preCorrectionCentsError,
            entry.pitchCorrectionCents,
            entry.finalYinHz,
            entry.finalYinCentsError,
            entry.finalAmdfHz,
            entry.finalAmdfCentsError,
            entry.finalMethodAgreementCents,
            entry.measuredHz,
            entry.centsError,
            entry.sourceFile,
            entry.guitarString,
            entry.fret,
            entry.sourceRangeIndex,
            entry.detectedRegionStartSec,
            entry.detectedRegionEndSec,
            entry.segmentStartSec,
            entry.segmentEndSec,
            entry.fixedSegmentDurationSec,
            entry.sourceDurationSec,
            entry.nextRegionStartSec,
            entry.rejectedForNextRegion,
            entry.rejectedForShortSource,
            entry.targetOnsetOffsetSec,
            entry.preAlignmentOnsetOffsetSec,
            entry.onsetAlignmentShiftSec,
            entry.measuredDurationSec,
            entry.onsetOffsetSec,
            entry.onsetStatus,
            entry.validationMessage,
            entry.outputFile,
        ];
        return `| ${values.map(markdownTableValue).join(' | ')} |`;
    });

    const lines = [
        '# Guitar Pitch Report',
        '',
        `Generated by: \`${COMMAND}\``,
        '',
        `- Target piano note count: ${targets.length}`,
        `- Generated guitar sample count: ${generated.length}`,
        `- Missing notes: ${missing.length}${missing.length ? ` (${missing.map((entry) => entry.outputNoteName).join(', ')})` : ''}`,
        `- Warnings: ${warnings.length}${warnings.length ? ` (${warnings.map((entry) => entry.outputNoteName).join(', ')})` : ''}`,
        `- Failures: ${failures.length}${failures.length ? ` (${failures.map((entry) => entry.outputNoteName).join(', ')})` : ''}`,
        '',
        `| ${tableHeaders.join(' | ')} |`,
        `| ${tableDivider.join(' | ')} |`,
        ...rows,
        '',
    ];

    writeFileSync(REPORT_PATH, `${lines.join('\n')}`);
}

function printDryRun(targets: TargetNote[], selected: Map<number, Candidate>): void {
    for (const target of targets) {
        const candidate = selected.get(target.midi);
        if (!candidate) {
            console.log(`${target.outputNoteName} midi=${target.midi}: missing`);
            continue;
        }
        console.log([
            `${target.outputNoteName} midi=${target.midi}`,
            `${candidate.source.filename}`,
            `index=${candidate.sourceRangeIndex}`,
            `string=${candidate.source.guitarString}`,
            `fret=${candidate.fret}`,
        ].join(' | '));
    }
}

async function buildAll(dryRun: boolean): Promise<void> {
    assertCommandOnPath('ffmpeg');
    assertCommandOnPath('ffprobe');

    const targets = deriveTargetNotes();
    const sources = discoverSources();
    const selected = selectCandidates(targets, sources);

    if (dryRun) {
        printDryRun(targets, selected);
        return;
    }

    mkdirSync(OUTPUT_DIR, { recursive: true });
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
    for (const existing of readdirSync(OUTPUT_DIR)) {
        if (existing.endsWith(`.${OUTPUT_EXT}`)) {
            rmSync(path.join(OUTPUT_DIR, existing));
        }
    }

    const tempDir = mkdtempSync(path.join(tmpdir(), 'bsharp-guitar-'));
    const decodedSources = new Map<string, { wav: WavData; regions: Region[] }>();
    const entries: ManifestEntry[] = [];

    try {
        for (const target of targets) {
            const candidate = selected.get(target.midi);
            if (!candidate) {
                entries.push(buildMissingEntry(target));
                continue;
            }

            let decoded = decodedSources.get(candidate.source.filename);
            if (!decoded) {
                const wavPath = decodeSourceToWav(candidate.source, tempDir);
                const wav = readWavFloat32(wavPath);
                const regions = detectRegions(wav, candidate.source.range.length);
                if (regions.length !== candidate.source.range.length) {
                    throw new Error(buildRegionDebug(candidate.source, regions));
                }
                decoded = { wav, regions };
                decodedSources.set(candidate.source.filename, decoded);
            }

            const region = decoded.regions[candidate.sourceRangeIndex];
            if (!region) {
                throw new Error(`Missing detected segment ${candidate.sourceRangeIndex} in ${candidate.source.filename}`);
            }

            const { startSec, endSec } = segmentBounds(region);
            const sourceDurationSec = decoded.wav.samples.length / decoded.wav.sampleRate;
            const nextRegion = decoded.regions[candidate.sourceRangeIndex + 1] ?? null;
            const rejectedForNextRegion = nextRegion !== null && nextRegion.startSec < endSec;
            const rejectedForShortSource = sourceDurationSec + SOURCE_END_TOLERANCE_SEC < endSec;
            const timingMessages = [
                rejectedForNextRegion
                    ? `Rejected: next detected region starts at ${nextRegion!.startSec.toFixed(4)}s inside fixed 2.000s window ending at ${endSec.toFixed(4)}s.`
                    : null,
                rejectedForShortSource
                    ? `Rejected: source ends at ${sourceDurationSec.toFixed(4)}s before fixed 2.000s window ending at ${endSec.toFixed(4)}s.`
                    : null,
            ].filter((message): message is string => message !== null);

            if (timingMessages.length > 0) {
                entries.push({
                    outputNoteName: target.outputNoteName,
                    midi: target.midi,
                    expectedHz: roundNumber(target.expectedHz)!,
                    preCorrectionYinHz: null,
                    preCorrectionYinCentsError: null,
                    preCorrectionAmdfHz: null,
                    preCorrectionAmdfCentsError: null,
                    preCorrectionMethodAgreementCents: null,
                    preCorrectionMeasuredHz: null,
                    preCorrectionCentsError: null,
                    pitchCorrectionCents: null,
                    finalYinHz: null,
                    finalYinCentsError: null,
                    finalAmdfHz: null,
                    finalAmdfCentsError: null,
                    finalMethodAgreementCents: null,
                    measuredHz: null,
                    centsError: null,
                    status: 'fail',
                    sourceFile: candidate.source.filename,
                    sourceRangeStart: candidate.source.sourceRangeStart,
                    sourceRangeEnd: candidate.source.sourceRangeEnd,
                    sourceRangeIndex: candidate.sourceRangeIndex,
                    guitarString: candidate.source.guitarString,
                    fret: candidate.fret,
                    detectedRegionStartSec: roundNumber(region.startSec),
                    detectedRegionEndSec: roundNumber(region.endSec),
                    segmentStartSec: roundNumber(startSec),
                    segmentEndSec: roundNumber(endSec),
                    fixedSegmentDurationSec: FIXED_SEGMENT_DURATION_SEC,
                    sourceDurationSec: roundNumber(sourceDurationSec),
                    nextRegionStartSec: roundNumber(nextRegion?.startSec ?? null),
                    rejectedForNextRegion,
                    rejectedForShortSource,
                    targetOnsetOffsetSec: TARGET_ONSET_OFFSET_SEC,
                    preAlignmentOnsetOffsetSec: null,
                    onsetAlignmentShiftSec: null,
                    measuredDurationSec: null,
                    onsetOffsetSec: null,
                    onsetStatus: null,
                    validationMessage: timingMessages.join(' '),
                    outputFile: null,
                });
                continue;
            }

            const relativeOutputFile = `static/notes/guitar/${target.outputNoteName}_${MEDIUM_SUFFIX}.${OUTPUT_EXT}`;
            const outputPath = path.join(REPO_ROOT, relativeOutputFile);
            const segmentWavPath = path.join(tempDir, `${target.outputNoteName}.segment.wav`);
            const alignedSegmentWavPath = path.join(tempDir, `${target.outputNoteName}.aligned.segment.wav`);
            exportSegmentToWav(candidate.source, segmentWavPath, startSec, endSec);

            const preAlignmentOnsetOffsetSec = measureFirstOnset(segmentWavPath, tempDir);
            const onsetAlignmentShiftSec = alignWavOnset(segmentWavPath, alignedSegmentWavPath, preAlignmentOnsetOffsetSec);

            const preCorrectionMeasurement = measurePitch(alignedSegmentWavPath, target.expectedHz, tempDir);
            const preCorrectionMeasuredHz = preCorrectionMeasurement.yinHz;
            const preCorrectionYinError = preCorrectionMeasurement.yinHz === null
                ? null
                : centsError(preCorrectionMeasurement.yinHz, target.expectedHz);
            const preCorrectionAmdfError = preCorrectionMeasurement.amdfHz === null
                ? null
                : centsError(preCorrectionMeasurement.amdfHz, target.expectedHz);
            const preCorrectionMethodAgreementCents = absoluteDifference(preCorrectionYinError, preCorrectionAmdfError);
            const preCorrectionError = preCorrectionYinError;
            let pitchRatio = preCorrectionMeasuredHz === null ? 1 : target.expectedHz / preCorrectionMeasuredHz;
            let pitchCorrectionCents = preCorrectionError === null ? null : -preCorrectionError;

            exportCorrectedMp3(alignedSegmentWavPath, outputPath, pitchRatio);
            let finalMeasurement = measurePitch(outputPath, target.expectedHz, tempDir);
            let measuredHz = finalMeasurement.yinHz;
            let error = measuredHz === null ? null : centsError(measuredHz, target.expectedHz);

            if (statusForCents(error) === 'fail' && measuredHz !== null && preCorrectionMeasuredHz !== null) {
                pitchRatio *= target.expectedHz / measuredHz;
                pitchCorrectionCents = 1200 * Math.log2(pitchRatio);
                exportCorrectedMp3(alignedSegmentWavPath, outputPath, pitchRatio);
                finalMeasurement = measurePitch(outputPath, target.expectedHz, tempDir);
                measuredHz = finalMeasurement.yinHz;
                error = measuredHz === null ? null : centsError(measuredHz, target.expectedHz);
            }
            const finalYinError = finalMeasurement.yinHz === null
                ? null
                : centsError(finalMeasurement.yinHz, target.expectedHz);
            const finalAmdfError = finalMeasurement.amdfHz === null
                ? null
                : centsError(finalMeasurement.amdfHz, target.expectedHz);
            const finalMethodAgreementCents = absoluteDifference(finalYinError, finalAmdfError);

            const measuredDurationSec = measureDuration(outputPath, tempDir);
            const onsetOffsetSec = measureFirstOnset(outputPath, tempDir);
            const pitchStatus = statusForCents(error);
            const durationStatus: Status = Math.abs(measuredDurationSec - FIXED_SEGMENT_DURATION_SEC) <= DURATION_TOLERANCE_SEC
                ? 'pass'
                : 'fail';
            const onsetStatus = statusForOnset(onsetOffsetSec);
            const status = mergeStatuses([pitchStatus, durationStatus, onsetStatus]);
            const validationMessage = [
                durationStatus === 'fail'
                    ? `Measured duration ${measuredDurationSec.toFixed(4)}s is outside tolerance for fixed 2.000s export.`
                    : null,
                onsetStatus === 'warn'
                    ? `Onset offset ${onsetOffsetSec === null ? 'could not be measured' : `${onsetOffsetSec.toFixed(4)}s`} is outside expected ${ONSET_EARLY_WARNING_SEC.toFixed(3)}-${ONSET_LATE_WARNING_SEC.toFixed(3)}s range.`
                    : null,
                pitchStatus === 'fail'
                    ? 'Pitch validation failed.'
                    : pitchStatus === 'warn'
                        ? 'Pitch validation warning.'
                        : null,
            ].filter((message): message is string => message !== null).join(' ') || null;
            if (status === 'fail') {
                rmSync(outputPath, { force: true });
            }

            entries.push({
                outputNoteName: target.outputNoteName,
                midi: target.midi,
                expectedHz: roundNumber(target.expectedHz)!,
                preCorrectionYinHz: roundNumber(preCorrectionMeasurement.yinHz),
                preCorrectionYinCentsError: roundNumber(preCorrectionYinError),
                preCorrectionAmdfHz: roundNumber(preCorrectionMeasurement.amdfHz),
                preCorrectionAmdfCentsError: roundNumber(preCorrectionAmdfError),
                preCorrectionMethodAgreementCents: roundNumber(preCorrectionMethodAgreementCents),
                preCorrectionMeasuredHz: roundNumber(preCorrectionMeasuredHz),
                preCorrectionCentsError: roundNumber(preCorrectionError),
                pitchCorrectionCents: roundNumber(pitchCorrectionCents),
                finalYinHz: roundNumber(finalMeasurement.yinHz),
                finalYinCentsError: roundNumber(finalYinError),
                finalAmdfHz: roundNumber(finalMeasurement.amdfHz),
                finalAmdfCentsError: roundNumber(finalAmdfError),
                finalMethodAgreementCents: roundNumber(finalMethodAgreementCents),
                measuredHz: roundNumber(measuredHz),
                centsError: roundNumber(error),
                status,
                sourceFile: candidate.source.filename,
                sourceRangeStart: candidate.source.sourceRangeStart,
                sourceRangeEnd: candidate.source.sourceRangeEnd,
                sourceRangeIndex: candidate.sourceRangeIndex,
                guitarString: candidate.source.guitarString,
                fret: candidate.fret,
                detectedRegionStartSec: roundNumber(region.startSec),
                detectedRegionEndSec: roundNumber(region.endSec),
                segmentStartSec: roundNumber(startSec),
                segmentEndSec: roundNumber(endSec),
                fixedSegmentDurationSec: FIXED_SEGMENT_DURATION_SEC,
                sourceDurationSec: roundNumber(sourceDurationSec),
                nextRegionStartSec: roundNumber(nextRegion?.startSec ?? null),
                rejectedForNextRegion,
                rejectedForShortSource,
                targetOnsetOffsetSec: TARGET_ONSET_OFFSET_SEC,
                preAlignmentOnsetOffsetSec: roundNumber(preAlignmentOnsetOffsetSec),
                onsetAlignmentShiftSec: roundNumber(onsetAlignmentShiftSec),
                measuredDurationSec: roundNumber(measuredDurationSec),
                onsetOffsetSec: roundNumber(onsetOffsetSec),
                onsetStatus,
                validationMessage,
                outputFile: status === 'fail' ? null : relativeOutputFile,
            });
        }

        writeManifest(entries);
        writeReport(entries, targets);

        const failures = entries.filter((entry) => entry.status === 'fail');
        if (failures.length > 0) {
            throw new Error(`Guitar sample validation failed for ${failures.map((entry) => entry.outputNoteName).join(', ')}`);
        }

        console.log(`Generated ${entries.filter((entry) => entry.outputFile).length} guitar samples.`);
        console.log(`Wrote ${path.relative(REPO_ROOT, MANIFEST_PATH)} and ${path.relative(REPO_ROOT, REPORT_PATH)}.`);
    } finally {
        rmSync(tempDir, { recursive: true, force: true });
    }
}

function parseArgs(argv: string[]): { dryRun: boolean } {
    const dryRun = argv.includes('--dry-run') || argv.includes('--check');
    const allowed = new Set(['--all', '--extract', '--verify', '--report', '--dry-run', '--check']);
    const unknown = argv.filter((arg) => !allowed.has(arg));
    if (unknown.length > 0) {
        throw new Error(`Unknown argument(s): ${unknown.join(', ')}`);
    }
    return { dryRun };
}

const isMain = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
    const args = parseArgs(process.argv.slice(2));
    buildAll(args.dryRun).catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    });
}
