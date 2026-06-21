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
    openProfileAdder, closeProfileAdder, addProfile, submitProfileChanges,
    deleteProfile, enableDownload, triggerEasterEgg, downloadState,
    registerGameCallbacks, onPanelOpen,
} from './ui';
import { cleanSessionHistory } from './session_cleanup';
import { PanelName } from './ui_store';

// Register callbacks to break circular dependency between ui.ts and game.ts
registerGameCallbacks(getEmojiLock, resetStats, changeSelector, onTrainerOpen);

// Reactive UI shell state (menu / panels), bound from the HTML via $store.ui.
Alpine.store('ui', {
    menuOpen: false,
    panel: '' as PanelName,
    toggleMenu(this: { menuOpen: boolean }) {
        this.menuOpen = !this.menuOpen;
    },
    open(this: { panel: PanelName }, name: Exclude<PanelName, ''>) {
        if (this.panel === name) {
            this.panel = '';
            return;
        }
        this.panel = name;
        onPanelOpen(name);
    },
    home(this: { panel: PanelName }) {
        this.panel = '';
    },
    close(this: { panel: PanelName }) {
        this.panel = '';
    },
});

// Expose game/profile actions for the inline onclick handlers in index.html.
const w = window as unknown as Record<string, unknown>;
w.play_audio = playAudio;
w.select_flag = selectFlag;
w.next_audio = nextAudio;
w.reset_stats = resetStats;
w.change_selector = changeSelector;
w.open_profile_adder = openProfileAdder;
w.close_profile_adder = closeProfileAdder;
w.add_profile = addProfile;
w.submit_profile_changes = submitProfileChanges;
w.delete_profile = deleteProfile;
w.enable_download = enableDownload;
w.trigger_easter_egg = triggerEasterEgg;
w.download_state = downloadState;
w.play_chord = playChord;
w.__bsharp_correct_color = () => _CORRECT_COLOR;

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
