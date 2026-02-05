import { describe, it, expect } from 'vitest';
import {
    CHORD_DEFINITIONS, CHORDS_TONE, FIRST_BLACK_INDEX,
    AUDIO_FILE_LIST, getNoteFilePrefix, computeAllNotes
} from '../../src/ts/data';

describe('chord data integrity', () => {
    it('has 14 chord definitions', () => {
        expect(CHORD_DEFINITIONS).toHaveLength(14);
    });

    it('CHORDS_TONE has one entry per chord definition', () => {
        expect(Object.keys(CHORDS_TONE)).toHaveLength(CHORD_DEFINITIONS.length);
    });

    it('every chord has exactly 3 notes', () => {
        for (const chord of CHORD_DEFINITIONS) {
            expect(chord.notes).toHaveLength(3);
        }
    });

    it('FIRST_BLACK_INDEX splits white and black chords correctly', () => {
        expect(CHORD_DEFINITIONS[FIRST_BLACK_INDEX].name).toBe('gray');
        expect(CHORD_DEFINITIONS[FIRST_BLACK_INDEX - 1].name).toBe('brown');
    });
});

describe('audio file data integrity', () => {
    it('has 3 files per chord (short, medium, long) = 42 total', () => {
        expect(AUDIO_FILE_LIST).toHaveLength(42);
    });

    it('every chord name appears in exactly 3 audio files', () => {
        for (const chord of CHORD_DEFINITIONS) {
            const matches = AUDIO_FILE_LIST.filter(f => f.includes(`_${chord.name}_`));
            expect(matches).toHaveLength(3);
        }
    });
});

describe('getNoteFilePrefix', () => {
    it('maps notes using German notation conventions', () => {
        expect(getNoteFilePrefix('Bb3')).toBe('as3');
        expect(getNoteFilePrefix('C#4')).toBe('cs4');
        expect(getNoteFilePrefix('B3')).toBe('h3');
    });
});

describe('computeAllNotes', () => {
    it('generates correct CSS classes for sharps', () => {
        const notes = computeAllNotes();
        const cSharp = notes.find(n => n.noteBase === 'C#4');
        expect(cSharp).toBeDefined();
        expect(cSharp!.noteClass).toBe('note-C-sharp');
        expect(cSharp!.display).toContain('\u266F');
    });

    it('generates correct CSS classes for flats', () => {
        const notes = computeAllNotes();
        const bFlat = notes.find(n => n.noteBase === 'Bb3');
        expect(bFlat).toBeDefined();
        expect(bFlat!.noteClass).toBe('note-B-flat');
        expect(bFlat!.display).toContain('\u266D');
    });
});
