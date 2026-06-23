import { describe, expect, it } from 'vitest';
import {
    centsError,
    expandChromaticRange,
    expectedHzForMidi,
    guitarFret,
    noteNameToMidi,
    parseGuitarFilename,
    selectLowestFretCandidate,
} from '../../sample-source/guitar/build-guitar-samples';

describe('guitar sample build helpers', () => {
    it('maps note names to MIDI, including flats', () => {
        expect(noteNameToMidi('A4')).toBe(69);
        expect(noteNameToMidi('Bb2')).toBe(46);
        expect(noteNameToMidi('Db4')).toBe(61);
        expect(noteNameToMidi('Ab4')).toBe(68);
    });

    it('parses guitar range filenames', () => {
        expect(parseGuitarFilename('Guitar.mf.sulD.C4Ab4.aif')).toMatchObject({
            dynamic: 'mf',
            guitarString: 'sulD',
            sourceRangeStart: 'C4',
            sourceRangeEnd: 'Ab4',
            startMidi: 60,
            endMidi: 68,
        });

        expect(parseGuitarFilename('Guitar.mf.sulB.B3.aif')).toMatchObject({
            dynamic: 'mf',
            guitarString: 'sulB',
            sourceRangeStart: 'B3',
            sourceRangeEnd: 'B3',
            startMidi: 59,
            endMidi: 59,
        });
    });

    it('expands chromatic ranges with flat endpoints', () => {
        expect(expandChromaticRange('C4', 'Ab4')).toEqual([
            'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4',
        ]);
    });

    it('calculates guitar frets from standard tuning', () => {
        expect(guitarFret('sulE', noteNameToMidi('E2'))).toBe(0);
        expect(guitarFret('sulA', noteNameToMidi('Bb2'))).toBe(1);
        expect(guitarFret('sulE', noteNameToMidi('Bb2'))).toBe(6);
    });

    it('selects the lowest fret with deterministic tie breakers', () => {
        const lowE = parseGuitarFilename('Guitar.mf.sulE.E2B2.aif')!;
        const aString = parseGuitarFilename('Guitar.mf.sulA.A2B2.aif')!;
        const midi = noteNameToMidi('Bb2');

        const selected = selectLowestFretCandidate([
            { source: lowE, midi, noteName: 'A#2', sourceRangeIndex: 6, fret: 6 },
            { source: aString, midi, noteName: 'A#2', sourceRangeIndex: 1, fret: 1 },
        ]);

        expect(selected?.source.guitarString).toBe('sulA');
        expect(selected?.fret).toBe(1);
    });

    it('requires exact octave matches', () => {
        expect(noteNameToMidi('A3')).not.toBe(noteNameToMidi('A4'));
    });

    it('computes cents error', () => {
        expect(centsError(440, expectedHzForMidi(69))).toBeCloseTo(0);
        expect(centsError(880, expectedHzForMidi(69))).toBeCloseTo(1200);
    });
});
