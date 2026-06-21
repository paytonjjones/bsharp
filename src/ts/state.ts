import { AppState, Profile, SessionStats, Tally } from './types';
import { CHORDS_TONE } from './data';
import { getCurrentTimestamp } from './utils';

export const STATE_KEY = 'bsharp_state';
export const SESSION_HISTORY_KEY = 'bsharp_session_history';
const LEGACY_STATE_KEY = 'cim_state';
const LEGACY_SESSION_HISTORY_KEY = 'cim_session_history';

const LEGACY_USER_ID = 0;
export const GUEST_USER_ID = 100;
export const SESSION_TIMEOUT_TIME_SECONDS = 60 * 30;

const DEFAULT_CHORD = Object.keys(CHORDS_TONE)[1]!;
export const DEFAULT_INSTRUMENT = 'piano_1';
export const DEFAULT_TARGET_NUMBER = 25;
export const DEFAULT_SHOW_CHORD_MODE = 'black_only';
export const DEFAULT_REVEAL_CHORD_MODE = 'always';
export const DEFAULT_CHORD_DISPLAY_MODE = 'shapes_and_letters';
export const DEFAULT_SINGLE_NOTE_MODE = 'white_only_on_black';
export const DEFAULT_SINGLE_NOTE_CORRECTNESS_MODE = 'only_correct';
export const DEFAULT_PERSIST_REACTION_FACE = true;
export const DEFAULT_ENABLE_ONBOARDING_HINTS = true;
export const DEFAULT_COLOR_SCHEME = 'dark';
export const DEFAULT_CHORD_SELECTION_MODE = 'random';

export let STATE: AppState = null!;
export let _SESSION_HISTORY: Record<string, Record<string, SessionStats[]>> | null = null;

function getObject<T>(key: string): T | null {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
}

function setObject(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
}

export function newTally(): Tally {
    return {
        correct: 0,
        identifications: 0,
        confusion_matrix: {},
    };
}

export function newStats(): SessionStats {
    return {
        current_chord: STATE !== null ? STATE.current_chord : DEFAULT_CHORD,
        start_time: getCurrentTimestamp(),
        updated_time: getCurrentTimestamp(),
        correct: 0,
        identifications: 0,
        confusion_matrix: {},
        notes: newTally(),
        done: false,
    };
}

export function newProfile(
    name: string,
    icon: string,
    id?: number | null,
    targetNumber = DEFAULT_TARGET_NUMBER,
    showChordMode = DEFAULT_SHOW_CHORD_MODE,
    revealChordMode = DEFAULT_REVEAL_CHORD_MODE,
    chordDisplayMode = DEFAULT_CHORD_DISPLAY_MODE,
    singleNoteMode = DEFAULT_SINGLE_NOTE_MODE,
    singleNoteCorrectnessMode = DEFAULT_SINGLE_NOTE_CORRECTNESS_MODE,
    persistReactionFace = DEFAULT_PERSIST_REACTION_FACE,
    enableOnboardingHints = DEFAULT_ENABLE_ONBOARDING_HINTS,
    colorScheme = DEFAULT_COLOR_SCHEME,
    chordSelectionMode = DEFAULT_CHORD_SELECTION_MODE,
): Profile {
    if (id === undefined || id === null) {
        id = GUEST_USER_ID + 1;
        while (id in STATE.profiles) {
            id++;
        }
    }
    return {
        id,
        name,
        icon,
        target_number: targetNumber,
        show_chord_mode: showChordMode,
        reveal_chord_mode: revealChordMode,
        chord_display_mode: chordDisplayMode,
        single_note_mode: singleNoteMode,
        single_note_correctness_mode: singleNoteCorrectnessMode,
        persist_reaction_face: persistReactionFace,
        enable_onboarding_hints: enableOnboardingHints,
        color_scheme: colorScheme,
        chord_selection_mode: chordSelectionMode,
        stats: newStats(),
        current_chord: DEFAULT_CHORD,
        current_instrument: DEFAULT_INSTRUMENT,
    };
}

export function initializeProfileDefaults(profile: Profile): void {
    const defaults: Record<string, unknown> = {
        show_chord_mode: DEFAULT_SHOW_CHORD_MODE,
        reveal_chord_mode: DEFAULT_REVEAL_CHORD_MODE,
        chord_display_mode: DEFAULT_CHORD_DISPLAY_MODE,
        single_note_mode: DEFAULT_SINGLE_NOTE_MODE,
        single_note_correctness_mode: DEFAULT_SINGLE_NOTE_CORRECTNESS_MODE,
        persist_reaction_face: DEFAULT_PERSIST_REACTION_FACE,
        enable_onboarding_hints: DEFAULT_ENABLE_ONBOARDING_HINTS,
        color_scheme: DEFAULT_COLOR_SCHEME,
        chord_selection_mode: DEFAULT_CHORD_SELECTION_MODE,
    };

    for (const [key, defaultVal] of Object.entries(defaults)) {
        if ((profile as unknown as Record<string, unknown>)[key] === undefined) {
            (profile as unknown as Record<string, unknown>)[key] = defaultVal;
        }
    }
}

export function loadState(): void {
    // Try BSharp keys, then fall back to legacy CIM keys.
    const loaded = getObject<AppState>(STATE_KEY) ?? getObject<AppState>(LEGACY_STATE_KEY);

    let state: AppState;
    if (loaded === null) {
        const newProfiles: Record<number, Profile> = {};
        newProfiles[GUEST_USER_ID] = newProfile('Guest', 'fa-user', GUEST_USER_ID);
        state = {
            profiles: newProfiles,
            current_chord: DEFAULT_CHORD,
            current_profile: GUEST_USER_ID,
        };
    } else if ((loaded as unknown as Record<string, unknown>)['profiles'] === undefined) {
        // Convert old-style state into profile-based state
        const newProfiles: Record<number, Profile> = {};
        newProfiles[LEGACY_USER_ID] = newProfile('Legacy User', 'fa-user', LEGACY_USER_ID);
        newProfiles[GUEST_USER_ID] = newProfile('Guest', 'fa-user', GUEST_USER_ID);
        const updatedState: AppState = {
            profiles: newProfiles,
            current_chord: loaded.current_chord,
            current_profile: GUEST_USER_ID,
        };
        if ((loaded as unknown as Record<string, unknown>)['stats']) {
            updatedState.profiles[LEGACY_USER_ID]!.stats = (loaded as unknown as Record<string, unknown>)['stats'] as SessionStats;
        }
        state = updatedState;
    } else {
        state = loaded;
    }

    if (state.current_profile === undefined || state.current_profile === null) {
        state.current_profile = GUEST_USER_ID;
    }

    for (const profile of Object.values(state.profiles)) {
        initializeProfileDefaults(profile);
    }

    STATE = state;
}

export function saveState(): void {
    setObject(STATE_KEY, STATE);
}

export function getCurrentProfile(): Profile {
    let currentProfileId = STATE.current_profile;
    if (!STATE.profiles.hasOwnProperty(currentProfileId)) {
        currentProfileId = GUEST_USER_ID;
        STATE.current_profile = currentProfileId;
    }
    return STATE.profiles[currentProfileId]!;
}

export function getCurrentTargetNumber(): number {
    let targetNumber = getCurrentProfile().target_number;
    if (targetNumber === undefined) {
        targetNumber = DEFAULT_TARGET_NUMBER;
        getCurrentProfile().target_number = targetNumber;
    }
    return targetNumber;
}

export function getSessionHistory(): Record<string, Record<string, SessionStats[]>> {
    let history = _SESSION_HISTORY;
    if (history === null) {
        history = getObject<Record<string, Record<string, SessionStats[]>>>(SESSION_HISTORY_KEY);
        // Migration from CIM keys
        if (history === null) {
            history = getObject<Record<string, Record<string, SessionStats[]>>>(LEGACY_SESSION_HISTORY_KEY);
        }
    }
    if (history === null || Array.isArray(history)) {
        history = {};
    }
    _SESSION_HISTORY = history;
    return history;
}

export function getCurrentSessionHistory(): SessionStats[] {
    const fullHistory = getSessionHistory();
    const profileId = String(getCurrentProfile().id);
    let histories = fullHistory[profileId];
    if (histories === undefined) {
        histories = {};
        fullHistory[profileId] = histories;
    }
    let history = histories[STATE.current_chord];
    if (history === undefined) {
        history = [];
        histories[STATE.current_chord] = history;
    }
    return history;
}

export function saveSessionHistory(): void {
    const sessionHistory = getSessionHistory();
    const profileId = String(getCurrentProfile().id);

    let currentSessionHistory = sessionHistory[profileId];
    if (currentSessionHistory === undefined) {
        currentSessionHistory = {};
    }

    const chord = STATE.current_chord;
    let chordHistory = currentSessionHistory[chord];
    if (chordHistory === undefined) {
        chordHistory = [];
        currentSessionHistory[chord] = chordHistory;
    }

    const currentStats = getCurrentProfile().stats;
    const lastSession = chordHistory[chordHistory.length - 1];
    if (lastSession === undefined || currentStats.start_time !== lastSession.start_time) {
        chordHistory.push(currentStats);
    }

    sessionHistory[profileId] = currentSessionHistory;
    setObject(SESSION_HISTORY_KEY, sessionHistory);
}

export function isRecent(timestamp: number): boolean {
    return (getCurrentTimestamp() - timestamp) <= SESSION_TIMEOUT_TIME_SECONDS;
}

export function setCurrentProfileById(profileId: number): void {
    STATE.current_profile = profileId;
}
