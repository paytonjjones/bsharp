import { loadState, getCurrentProfile, isRecent, STATE } from './state';
import {
    playAudio, selectFlagWrapper, nextAudio, resetStats, changeSelector,
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

// Expose functions still used by inline handlers.
const w = window as unknown as Record<string, unknown>;
w.play_audio = playAudio;
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

const FLAG_BOUNDARY_SLOP_PX = 10;

type PendingFlagPointer = {
    pointerId: number;
    wrapperElem: HTMLElement;
    leftOriginalBounds: boolean;
};

let pendingFlagPointer: PendingFlagPointer | null = null;

function flagWrapperFromEvent(event: PointerEvent, holder: HTMLElement): HTMLElement | null {
    const target = event.target as Element | null;
    const wrapperElem = target?.closest('.flag-wrapper.visible') as HTMLElement | null;
    if (!wrapperElem || !holder.contains(wrapperElem)) return null;
    return wrapperElem;
}

function isPointInsideElementBounds(
    x: number,
    y: number,
    elem: HTMLElement,
    slopPx = FLAG_BOUNDARY_SLOP_PX,
): boolean {
    const rect = elem.getBoundingClientRect();
    return (
        x >= rect.left - slopPx &&
        x <= rect.right + slopPx &&
        y >= rect.top - slopPx &&
        y <= rect.bottom + slopPx
    );
}

export function installFlagPointerHandling(): void {
    const holder = document.getElementById('flag-holder');
    if (!holder) return;

    holder.addEventListener('pointerdown', (event) => {
        if (pendingFlagPointer !== null) {
            pendingFlagPointer = null;
            return;
        }
        if (!event.isPrimary) return;
        const wrapperElem = flagWrapperFromEvent(event, holder);
        if (!wrapperElem) return;

        pendingFlagPointer = {
            pointerId: event.pointerId,
            wrapperElem,
            leftOriginalBounds: false,
        };

        if (wrapperElem.setPointerCapture) {
            wrapperElem.setPointerCapture(event.pointerId);
        }
    });

    holder.addEventListener('pointermove', (event) => {
        if (!pendingFlagPointer || pendingFlagPointer.pointerId !== event.pointerId) return;
        if (
            !isPointInsideElementBounds(
                event.clientX,
                event.clientY,
                pendingFlagPointer.wrapperElem,
            )
        ) {
            pendingFlagPointer.leftOriginalBounds = true;
        }
    });

    holder.addEventListener('pointerup', (event) => {
        if (!pendingFlagPointer || pendingFlagPointer.pointerId !== event.pointerId) return;

        const pending = pendingFlagPointer;
        pendingFlagPointer = null;

        if (
            !pending.leftOriginalBounds &&
            isPointInsideElementBounds(event.clientX, event.clientY, pending.wrapperElem)
        ) {
            event.preventDefault();
            stopCurrentAudio();
            selectFlagWrapper(pending.wrapperElem);
        }
    });

    const clearPointer = (event: PointerEvent) => {
        if (!pendingFlagPointer || pendingFlagPointer.pointerId !== event.pointerId) return;
        pendingFlagPointer = null;
    };

    holder.addEventListener('pointercancel', clearPointer);
    holder.addEventListener('lostpointercapture', clearPointer);
}

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
    installFlagPointerHandling();
    initOnboarding();
    updateStatsDisplay();
    cleanSessionHistory();
    initActiveState();
});
