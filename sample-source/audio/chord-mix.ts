import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { probeAudio, runCommand, type ProbeResult } from './ffmpeg.ts';
import { chordFileStem, getNoteFilePrefix } from './note-names.ts';
import type { ChordDefinition } from './chord-definitions.ts';

export interface ChordMixVariant {
    name: string;
    description: string;
    outputDir: string;
    perInputFilters: string[];
    inputDelayStepMs: number;
    amixOptions: string[];
    postMixFilters: string[];
}

export interface ChordManifestEntry {
    chordName: string;
    display: string;
    chord: string;
    notes: string[];
    sourceFiles: string[];
    variant: string;
    variantDescription: string;
    inputDelayStepMs: number;
    inputDelayMs: number[];
    targetDurationSec: number;
    fadeOutSec: number;
    filterGraph: string;
    outputFile: string;
    ffprobe: ProbeResult;
}

export interface BuildChordAssetsOptions {
    repoRoot: string;
    command: string;
    sourceNoteDir: string;
    manifestPath: string;
    reportPath: string;
    targetDurationSec: number;
    fadeOutSec: number;
    outputBitrate: string;
    chords: ChordDefinition[];
    variants: ChordMixVariant[];
}

function sourceFileForNote(sourceNoteDir: string, note: string): string {
    return path.join(sourceNoteDir, `${getNoteFilePrefix(note)}_medium.mp3`);
}

function inputDelayFilters(variant: ChordMixVariant, inputIndex: number): string[] {
    const delayMs = variant.inputDelayStepMs * inputIndex;
    if (delayMs <= 0) {
        return [];
    }
    return [`adelay=${delayMs}:all=1`];
}

function buildFilterGraph(inputCount: number, variant: ChordMixVariant, targetDurationSec: number, fadeOutSec: number): string {
    const fadeStart = targetDurationSec - fadeOutSec;
    const chains: string[] = [];
    const inputLabels: string[] = [];

    for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1) {
        const label = `n${inputIndex}`;
        inputLabels.push(`[${label}]`);
        const filters = [
            'atrim=start=0',
            'asetpts=PTS-STARTPTS',
            ...variant.perInputFilters,
            ...inputDelayFilters(variant, inputIndex),
        ];
        chains.push(`[${inputIndex}:a]${filters.join(',')}[${label}]`);
    }

    const postMixFilters = [
        `atrim=duration=${targetDurationSec.toFixed(3)}`,
        'asetpts=PTS-STARTPTS',
        `afade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeOutSec.toFixed(3)}`,
        ...variant.postMixFilters,
    ];

    chains.push(`${inputLabels.join('')}amix=${variant.amixOptions.join(':')},${postMixFilters.join(',')}[out]`);
    return chains.join(';');
}

function generateChord(chord: ChordDefinition, variant: ChordMixVariant, options: BuildChordAssetsOptions): ChordManifestEntry {
    if (chord.notes.length !== 3) {
        throw new Error(`Only 3-note chords are supported: ${chord.name}`);
    }

    const sourceFiles = chord.notes.map((note) => sourceFileForNote(options.sourceNoteDir, note));
    for (const sourceFile of sourceFiles) {
        if (!existsSync(sourceFile)) {
            throw new Error(`Missing source note file: ${sourceFile}`);
        }
    }

    const outputFile = path.join(variant.outputDir, `${chordFileStem(chord.notes, chord.name)}.mp3`);
    const filterGraph = buildFilterGraph(sourceFiles.length, variant, options.targetDurationSec, options.fadeOutSec);
    runCommand('ffmpeg', [
        '-v', 'error',
        '-y',
        ...sourceFiles.flatMap((sourceFile) => ['-i', sourceFile]),
        '-filter_complex', filterGraph,
        '-map', '[out]',
        '-ac', '1',
        '-ar', '44100',
        '-codec:a', 'libmp3lame',
        '-b:a', options.outputBitrate,
        outputFile,
    ]);

    return {
        chordName: chord.name,
        display: chord.display,
        chord: chord.chord,
        notes: chord.notes,
        sourceFiles: sourceFiles.map((sourceFile) => path.relative(options.repoRoot, sourceFile)),
        variant: variant.name,
        variantDescription: variant.description,
        inputDelayStepMs: variant.inputDelayStepMs,
        inputDelayMs: chord.notes.map((_, inputIndex) => variant.inputDelayStepMs * inputIndex),
        targetDurationSec: options.targetDurationSec,
        fadeOutSec: options.fadeOutSec,
        filterGraph,
        outputFile: path.relative(options.repoRoot, outputFile),
        ffprobe: probeAudio(outputFile),
    };
}

function markdownTableValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).replace(/\|/g, '\\|');
}

function writeManifest(entries: ChordManifestEntry[], options: BuildChordAssetsOptions): void {
    writeFileSync(options.manifestPath, `${JSON.stringify({
        command: options.command,
        sourceNoteDir: path.relative(options.repoRoot, options.sourceNoteDir),
        generatedAt: new Date().toISOString(),
        entries,
    }, null, 2)}\n`);
}

function writeReport(entries: ChordManifestEntry[], options: BuildChordAssetsOptions): void {
    const rows = entries.map((entry) => [
        entry.variant,
        entry.chordName,
        entry.chord,
        entry.notes.join(' '),
        entry.inputDelayMs.join(' '),
        entry.sourceFiles.join('<br>'),
        entry.outputFile,
        entry.ffprobe.durationSec?.toFixed(3) ?? '',
        entry.ffprobe.codecName ?? '',
        entry.ffprobe.sampleRate ?? '',
        entry.ffprobe.channels ?? '',
    ].map(markdownTableValue).join(' | '));

    const lines = [
        '# Chord Asset Report',
        '',
        `Generated by: \`${options.command}\``,
        '',
        `- Source note directory: \`${path.relative(options.repoRoot, options.sourceNoteDir)}\``,
        `- Generated files: ${entries.length}`,
        `- Target duration: ${options.targetDurationSec.toFixed(1)}s`,
        `- Fade-out: ${options.fadeOutSec.toFixed(2)}s`,
        '',
        '## Variants',
        '',
        ...options.variants.map((variant) => `- \`${variant.name}\`: ${variant.description}`),
        '',
        '## Files',
        '',
        '| Variant | Name | Chord | Notes | Delay Ms | Source Files | Output File | Duration | Codec | Sample Rate | Channels |',
        '| --- | --- | --- | --- | --- | --- | --- | ---: | --- | ---: | ---: |',
        ...rows,
        '',
    ];

    writeFileSync(options.reportPath, `${lines.join('\n')}`);
}

export function buildChordAssets(options: BuildChordAssetsOptions): ChordManifestEntry[] {
    for (const variant of options.variants) {
        rmSync(variant.outputDir, { recursive: true, force: true });
        mkdirSync(variant.outputDir, { recursive: true });
    }

    const entries: ChordManifestEntry[] = [];
    for (const variant of options.variants) {
        for (const chord of options.chords) {
            entries.push(generateChord(chord, variant, options));
        }
    }

    writeManifest(entries, options);
    writeReport(entries, options);
    return entries;
}
