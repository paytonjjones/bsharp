export interface ChordDefinition {
    name: string;
    display: string;
    chord: string;
    notes: string[];
}

export interface InstrumentDefinition {
    id: string;
    display: string;
    chordPath: string;
}

export interface AudioFileInfo {
    filename: string;
    instrument: string;
    color: string;
    chord: string;
    ext: string;
    elem: HTMLAudioElement | null;
}

export interface NoteAudioFileInfo {
    filename: string;
    notePrefix: string;
    ext: string;
    elem: HTMLAudioElement | null;
}

export interface Tally {
    correct: number;
    identifications: number;
    confusion_matrix: Record<string, Record<string, number>>;
}

export interface SessionStats {
    current_chord: string;
    start_time: number;
    updated_time: number;
    correct: number;
    identifications: number;
    confusion_matrix: Record<string, Record<string, number>>;
    notes: Tally;
    done: boolean;
}

export interface Profile {
    id: number;
    name: string;
    icon: string;
    target_number: number;
    show_chord_mode: string;
    reveal_chord_mode: string;
    chord_display_mode: string;
    single_note_mode: string;
    single_note_correctness_mode: string;
    persist_reaction_face: boolean;
    enable_onboarding_hints: boolean;
    color_scheme: string;
    chord_selection_mode: string;
    auto_play: boolean;
    auto_play_duration_seconds: number;
    stats: SessionStats;
    current_chord: string;
    current_instrument: string;
}

export interface AppState {
    profiles: Record<number, Profile>;
    current_chord: string;
    current_profile: number;
}

export interface NoteInfo {
    display: string;
    noteClass: string;
    absoluteClass: string;
    noteBase: string;
}
