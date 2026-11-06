import { describe, it, expect, vi } from 'vitest';

// Mock localStorage before importing state
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
});

import {
    DEFAULT_AUTO_PLAY,
    DEFAULT_AUTO_PLAY_DURATION_SECONDS,
    DEFAULT_INSTRUMENT,
    initializeProfileDefaults,
} from '../../src/ts/state';
import type { Profile } from '../../src/ts/types';

describe('initializeProfileDefaults', () => {
    it('fills in missing fields with defaults', () => {
        const partial = { name: 'Test', icon: 'fa-user', id: 1 } as unknown as Profile;
        initializeProfileDefaults(partial);
        expect(partial.show_chord_mode).toBe('black_only');
        expect(partial.reveal_chord_mode).toBe('always');
        expect(partial.chord_display_mode).toBe('shapes_and_letters');
        expect(partial.persist_reaction_face).toBe(true);
        expect(partial.current_instrument).toBe(DEFAULT_INSTRUMENT);
        expect(partial.auto_play).toBe(DEFAULT_AUTO_PLAY);
        expect(partial.auto_play_duration_seconds).toBe(DEFAULT_AUTO_PLAY_DURATION_SECONDS);
    });

    it('does not overwrite existing values', () => {
        const profile = {
            name: 'Test', icon: 'fa-user', id: 1,
            show_chord_mode: 'always',
        } as unknown as Profile;
        initializeProfileDefaults(profile);
        expect(profile.show_chord_mode).toBe('always');
    });

    it('does not overwrite an existing current instrument', () => {
        const profile = {
            name: 'Test', icon: 'fa-user', id: 1,
            current_instrument: 'guitar',
        } as unknown as Profile;
        initializeProfileDefaults(profile);
        expect(profile.current_instrument).toBe('guitar');
    });

    it('preserves existing auto-play settings', () => {
        const profile = {
            name: 'Test', icon: 'fa-user', id: 1,
            auto_play: false,
            auto_play_duration_seconds: 8,
        } as unknown as Profile;
        initializeProfileDefaults(profile);
        expect(profile.auto_play).toBe(false);
        expect(profile.auto_play_duration_seconds).toBe(8);
    });

    it('uses the default duration for an invalid saved duration', () => {
        const profile = {
            name: 'Test', icon: 'fa-user', id: 1,
            auto_play_duration_seconds: 11,
        } as unknown as Profile;
        initializeProfileDefaults(profile);
        expect(profile.auto_play_duration_seconds).toBe(DEFAULT_AUTO_PLAY_DURATION_SECONDS);
    });
});
