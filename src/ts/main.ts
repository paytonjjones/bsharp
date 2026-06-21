import '../style.css';
import Alpine from 'alpinejs';

import { loadState, getCurrentProfile, isRecent } from './state';
import {
    playAudio, selectFlag, nextAudio, resetStats, changeSelector,
    onTrainerOpen, playChord, getEmojiLock, stopCurrentAudio,
    _CORRECT_COLOR
} from './game';
import { initOnboarding } from './onboarding';
import {
    applyColorScheme,
    populateProfileUiElements, updateStatsDisplay, setChordDisplayMode,
    addProfile, submitProfileChanges, deleteProfile,
    triggerEasterEgg, downloadState,
    registerGameCallbacks, onPanelOpen,
} from './ui';
import { cleanSessionHistory } from './session_cleanup';
import { PanelName, UiStore } from './ui_store';

// Game/profile actions exposed on `window` for the inline onclick handlers in
// index.html, plus the test hooks read by the Playwright/jsdom suites.
declare global {
    interface Window {
        play_audio: () => void;
        select_flag: (el: HTMLElement) => void;
        next_audio: () => void;
        reset_stats: (done?: boolean) => void;
        change_selector: (to?: string) => void;
        add_profile: () => void;
        submit_profile_changes: () => void;
        delete_profile: () => void;
        trigger_easter_egg: () => void;
        download_state: () => void;
        play_chord: (color: string) => void;
        __bsharp_correct_color: () => string | null;
        __bsharp_test_deterministic_color?: string | null;
    }
}

// Register callbacks to break circular dependency between ui.ts and game.ts
registerGameCallbacks(getEmojiLock, resetStats, changeSelector, onTrainerOpen);

// Reactive UI shell state (menu / panels), bound from the HTML via $store.ui.
Alpine.store('ui', {
    menuOpen: false,
    panel: '',
    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    },
    open(name: Exclude<PanelName, ''>) {
        if (this.panel === name) {
            this.panel = '';
            return;
        }
        this.panel = name;
        onPanelOpen(name);
    },
    home() {
        this.panel = '';
    },
    close() {
        this.panel = '';
    },
} satisfies UiStore);

window.play_audio = playAudio;
window.select_flag = selectFlag;
window.next_audio = nextAudio;
window.reset_stats = resetStats;
window.change_selector = changeSelector;
window.add_profile = addProfile;
window.submit_profile_changes = submitProfileChanges;
window.delete_profile = deleteProfile;
window.trigger_easter_egg = triggerEasterEgg;
window.download_state = downloadState;
window.play_chord = playChord;
window.__bsharp_correct_color = () => _CORRECT_COLOR;

// Stop any playing audio when the user clicks an interactive element.
document.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('#play-button, #next-chord')) return;
    if (target.closest('[onclick], button, a, select, input')) {
        stopCurrentAudio();
    }
}, true);

function init(): void {
    loadState();

    const profile = getCurrentProfile();
    const stats = profile.stats;
    if (stats !== undefined && stats.updated_time !== undefined) {
        if (!isRecent(stats.updated_time)) {
            resetStats();
        }
    }

    populateProfileUiElements();
    setChordDisplayMode(profile.chord_display_mode);
    applyColorScheme(profile.color_scheme);
    changeSelector(profile.current_chord);
    initOnboarding();
    updateStatsDisplay();
    cleanSessionHistory();
}

Alpine.start();
init();
