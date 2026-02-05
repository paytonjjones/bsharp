import { describe, it, expect, vi } from 'vitest';

// Mock localStorage before importing state
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
});

import { initializeProfileDefaults } from '../../src/ts/state';
import type { Profile } from '../../src/ts/types';

describe('initializeProfileDefaults', () => {
    it('fills in missing fields with defaults', () => {
        const partial = { name: 'Test', icon: 'fa-user', id: 1 } as unknown as Profile;
        initializeProfileDefaults(partial);
        expect(partial.show_chord_mode).toBe('black_only');
        expect(partial.reveal_chord_mode).toBe('always');
        expect(partial.chord_display_mode).toBe('shapes_and_letters');
        expect(partial.persist_reaction_face).toBe(false);
    });

    it('does not overwrite existing values', () => {
        const profile = {
            name: 'Test', icon: 'fa-user', id: 1,
            show_chord_mode: 'always',
        } as unknown as Profile;
        initializeProfileDefaults(profile);
        expect(profile.show_chord_mode).toBe('always');
    });
});
