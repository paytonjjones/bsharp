import { ChordDefinition, NoteInfo } from './types';

export const CHORD_DEFINITIONS: ChordDefinition[] = [
    { name: "red", display: "Red", chord: "C", notes: ["C4", "E4", "G4"] },
    { name: "yellow", display: "Yellow", chord: "F/C", notes: ["C4", "F4", "A4"] },
    { name: "blue", display: "Blue", chord: "G/B", notes: ["B3", "D4", "G4"] },
    { name: "black", display: "Black", chord: "F/A", notes: ["A3", "C4", "F4"] },
    { name: "green", display: "Green", chord: "G/D", notes: ["D4", "G4", "B4"] },
    { name: "orange", display: "Orange", chord: "C/E", notes: ["E4", "G4", "C5"] },
    { name: "purple", display: "Purple", chord: "F", notes: ["F4", "A4", "C5"] },
    { name: "pink", display: "Pink", chord: "G", notes: ["G4", "B4", "D5"] },
    { name: "brown", display: "Brown", chord: "C/G", notes: ["G4", "C5", "E5"] },
    { name: "gray", display: "Gray", chord: "A", notes: ["A3", "C#4", "E4"] },
    { name: "tan", display: "Tan", chord: "D", notes: ["D4", "F#4", "A4"] },
    { name: "lightgreen", display: "Light Green", chord: "E", notes: ["E4", "G#4", "B4"] },
    { name: "lightpurple", display: "Light Purple", chord: "Bb", notes: ["Bb3", "D4", "F4"] },
    { name: "skyblue", display: "Sky Blue", chord: "Eb", notes: ["Eb4", "G4", "Bb4"] },
];

export const CHORDS_TONE: Record<string, string[]> = Object.fromEntries(
    CHORD_DEFINITIONS.map(c => [c.name, c.notes])
);

export const FIRST_BLACK_INDEX = 9;

export const AUDIO_FILE_LIST: string[] = [
    "acf_black_long.mp3",
    "acf_black_medium.mp3",
    "acf_black_short.mp3",
    "acse_gray_long.mp3",
    "acse_gray_medium.mp3",
    "acse_gray_short.mp3",
    "asdf_lightpurple_long.mp3",
    "asdf_lightpurple_medium.mp3",
    "asdf_lightpurple_short.mp3",
    "ceg_red_long.mp3",
    "ceg_red_medium.mp3",
    "ceg_red_short.mp3",
    "cfa_yellow_long.mp3",
    "cfa_yellow_medium.mp3",
    "cfa_yellow_short.mp3",
    "dfsa_tan_long.mp3",
    "dfsa_tan_medium.mp3",
    "dfsa_tan_short.mp3",
    "dgh_green_long.mp3",
    "dgh_green_medium.mp3",
    "dgh_green_short.mp3",
    "dsgas_skyblue_long.mp3",
    "dsgas_skyblue_medium.mp3",
    "dsgas_skyblue_short.mp3",
    "egc_orange_long.mp3",
    "egc_orange_medium.mp3",
    "egc_orange_short.mp3",
    "egsh_lightgreen_long.mp3",
    "egsh_lightgreen_medium.mp3",
    "egsh_lightgreen_short.mp3",
    "fac_purple_long.mp3",
    "fac_purple_medium.mp3",
    "fac_purple_short.mp3",
    "gce_brown_long.mp3",
    "gce_brown_medium.mp3",
    "gce_brown_short.mp3",
    "ghd_pink_long.mp3",
    "ghd_pink_medium.mp3",
    "ghd_pink_short.mp3",
    "hdg_blue_long.mp3",
    "hdg_blue_medium.mp3",
    "hdg_blue_short.mp3",
];

export const NOTE_AUDIO_FILE_LIST: string[] = [
    "a3_short.mp3",
    "a3_medium.mp3",
    "a3_long.mp3",
    "as3_short.mp3",
    "as3_medium.mp3",
    "as3_long.mp3",
    "h3_short.mp3",
    "h3_medium.mp3",
    "h3_long.mp3",
    "c4_short.mp3",
    "c4_medium.mp3",
    "c4_long.mp3",
    "cs4_short.mp3",
    "cs4_medium.mp3",
    "cs4_long.mp3",
    "d4_short.mp3",
    "d4_medium.mp3",
    "d4_long.mp3",
    "ds4_short.mp3",
    "ds4_medium.mp3",
    "ds4_long.mp3",
    "e4_short.mp3",
    "e4_medium.mp3",
    "e4_long.mp3",
    "f4_short.mp3",
    "f4_medium.mp3",
    "f4_long.mp3",
    "fs4_short.mp3",
    "fs4_medium.mp3",
    "fs4_long.mp3",
    "g4_short.mp3",
    "g4_medium.mp3",
    "g4_long.mp3",
    "gs4_short.mp3",
    "gs4_medium.mp3",
    "gs4_long.mp3",
    "a4_short.mp3",
    "a4_medium.mp3",
    "a4_long.mp3",
    "as4_short.mp3",
    "as4_medium.mp3",
    "as4_long.mp3",
    "h4_short.mp3",
    "h4_medium.mp3",
    "h4_long.mp3",
    "c5_short.mp3",
    "c5_medium.mp3",
    "c5_long.mp3",
    "d5_short.mp3",
    "d5_medium.mp3",
    "d5_long.mp3",
    "e5_short.mp3",
    "e5_medium.mp3",
    "e5_long.mp3",
];

/** Map from full note name (e.g. "C4") to file prefix (e.g. "c4") */
const NOTE_TO_FILE_PREFIX: Record<string, string> = {
    'A3': 'a3', 'Bb3': 'as3', 'B3': 'h3',
    'C4': 'c4', 'C#4': 'cs4', 'D4': 'd4', 'Eb4': 'ds4',
    'E4': 'e4', 'F4': 'f4', 'F#4': 'fs4', 'G4': 'g4', 'G#4': 'gs4',
    'A4': 'a4', 'Bb4': 'as4', 'B4': 'h4',
    'C5': 'c5', 'D5': 'd5', 'E5': 'e5',
};

export function getNoteFilePrefix(note: string): string {
    return NOTE_TO_FILE_PREFIX[note] || note.toLowerCase();
}

/** Strip octave digits from note names (e.g. "C4" -> "C", "Bb3" -> "Bb") */
function stripOctave(note: string): string {
    return note.replace(/[0-9]/g, '');
}

/** Compute display notes for each chord: [colorName, [displayNote1, displayNote2, ...]] */
export function computeDisplayNotes(): [string, string[]][] {
    return CHORD_DEFINITIONS.map(color => [
        color.name,
        color.notes.map(stripOctave)
    ]);
}

/**
 * Compute all unique notes across all chords, sorted from lowest to highest.
 * Returns array of NoteInfo objects with display name, CSS classes, and base note.
 */
export function computeAllNotes(): NoteInfo[] {
    // Collect all notes from all chords
    const allRawNotes: string[] = [];
    for (const chord of CHORD_DEFINITIONS) {
        for (const note of chord.notes) {
            allRawNotes.push(note);
        }
    }

    // Unique notes
    const uniqueNotes = [...new Set(allRawNotes)];

    // Build note info with sort keys
    const noteMap: { sortKey: string; info: NoteInfo }[] = [];

    for (const note of uniqueNotes) {
        const letter = note[0]!;
        const remaining = note.slice(1);
        const number = remaining.replace(/#/g, '').replace(/b/g, '');
        let accidental = '';
        if (note.includes('#')) accidental = '#';
        else if (note.includes('b')) accidental = 'b';

        const noteBase = letter + accidental;
        const display = noteBase.replace(/#/g, '\u266F').replace(/b/g, '\u266D');
        const noteClass = 'note-' + noteBase.replace(/#/g, '-sharp').replace(/b/g, '-flat');
        const absoluteClass = 'note-' + (noteBase + number).replace(/#/g, '-sharp').replace(/b/g, '-flat');

        // Sort key: number + letter-mapped + accidental-priority
        const letterMap: Record<string, string> = { 'A': 'H', 'B': 'I' };
        const mappedLetter = letterMap[letter] || letter;
        const accidentalPriority = accidental === '#' ? '1' : accidental === 'b' ? '3' : '2';
        const sortKey = number + mappedLetter + accidentalPriority;

        noteMap.push({
            sortKey,
            info: { display, noteClass, absoluteClass, noteBase: note }
        });
    }

    noteMap.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return noteMap.map(n => n.info);
}
