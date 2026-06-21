import Alpine from 'alpinejs';

// Reactive UI shell state, driven by Alpine. The HTML binds to `$store.ui`
// for menu / panel / active-tab visibility; imperative game and profile code
// reaches the same state through getUiStore().
export type PanelName = '' | 'info' | 'trainer' | 'stats' | 'profile';

export interface UiStore {
    menuOpen: boolean;
    panel: PanelName;
    toggleMenu(): void;
    open(name: Exclude<PanelName, ''>): void;
    home(): void;
    close(): void;
}

export function getUiStore(): UiStore {
    return Alpine.store('ui') as UiStore;
}
