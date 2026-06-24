const NOTE_TO_FILE_PREFIX: Record<string, string> = {
    A3: 'a3', Bb3: 'as3', B3: 'h3',
    C4: 'c4', 'C#4': 'cs4', D4: 'd4', Eb4: 'ds4',
    E4: 'e4', F4: 'f4', 'F#4': 'fs4', G4: 'g4', 'G#4': 'gs4',
    A4: 'a4', Bb4: 'as4', B4: 'h4',
    C5: 'c5', D5: 'd5', E5: 'e5',
};

export function getNoteFilePrefix(note: string): string {
    const prefix = NOTE_TO_FILE_PREFIX[note];
    if (!prefix) {
        throw new Error(`No note asset prefix configured for ${note}`);
    }
    return prefix;
}

export function chordFileStem(notes: string[], chordName: string): string {
    return `${notes.map(getNoteFilePrefix).join('')}_${chordName}`;
}
