import { loadState, getCurrentProfile, isRecent, STATE } from './state';
import {
    playAudio, selectFlag, nextAudio, resetStats, changeSelector,
    onTrainerOpen, playChord, getEmojiLock, stopCurrentAudio,
    _CORRECT_COLOR
} from './game';
import { initOnboarding } from './onboarding';
import {
    toggleExpansionBar, toggleInfoboxVisibility, toggleStatsHistoryVisibility,
    toggleProfilePanel, applyColorScheme,
    toggleTrainerVisibility, closePanel, initActiveState,
    populateProfileUiElements,
    updateStatsDisplay, setChordDisplayMode,
    openProfileAdder, closeProfileAdder, addProfile, submitProfileChanges,
    deleteProfile, enableDownload, triggerEasterEgg, downloadState,
    setCurrentProfile, resetCatEmoji, registerGameCallbacks,
    showScreenPinningInfo, closeScreenPinningModal,
} from './ui';
import { cleanSessionHistory } from './session_cleanup';

// Register callbacks to break circular dependency between ui.ts and game.ts
registerGameCallbacks(getEmojiLock, resetStats, changeSelector, onTrainerOpen);

// Expose functions to window for onclick attributes
const w = window as unknown as Record<string, unknown>;
w.play_audio = playAudio;
w.select_flag = selectFlag;
w.next_audio = nextAudio;
w.reset_stats = resetStats;
w.change_selector = changeSelector;
w.toggle_expansion_bar = toggleExpansionBar;
w.toggle_trainer_visibility = toggleTrainerVisibility;
w.toggle_infobox_visibility = toggleInfoboxVisibility;
w.close_panel = closePanel;
w.toggle_stats_history_visibility = toggleStatsHistoryVisibility;
w.toggle_profile_panel = toggleProfilePanel;
w.open_profile_adder = openProfileAdder;
w.close_profile_adder = closeProfileAdder;
w.add_profile = addProfile;
w.submit_profile_changes = submitProfileChanges;
w.delete_profile = deleteProfile;
w.enable_download = enableDownload;
w.trigger_easter_egg = triggerEasterEgg;
w.download_state = downloadState;
w.play_chord = playChord;
w.show_screen_pinning_info = showScreenPinningInfo;
w.close_screen_pinning_modal = closeScreenPinningModal;
w.__bsharp_correct_color = () => _CORRECT_COLOR;

// Stop any playing audio when the user clicks an interactive element.
document.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('#play-button, #next-chord')) return;
    if (target.closest('[onclick], button, a, select, input')) {
        stopCurrentAudio();
    }
}, true);

document.addEventListener('DOMContentLoaded', function () {
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
    initActiveState();
});
