// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadBodyHtml(): string {
    const html = readFileSync(resolve(__dirname, '../../src/index.html'), 'utf8');
    const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/)!;
    return match[1].replace(/<script[\s\S]*?<\/script>/g, '');
}

function tick(): Promise<void> {
    return new Promise((r) => setTimeout(r, 0));
}

describe('app smoke (jsdom + Alpine)', () => {
    beforeAll(async () => {
        localStorage.clear();
        document.body.setAttribute('x-data', '');
        document.body.className = 'colorscheme-dark';
        document.body.innerHTML = loadBodyHtml();
        // Importing main.ts registers the Alpine store, starts Alpine and runs init().
        await import('../../src/ts/main.ts');
        await tick();
        await tick();
    });

    it('starts on the home view with no panel open', () => {
        expect(document.getElementById('home-button')!.classList.contains('active')).toBe(true);
        expect(document.querySelector('.cim-container')!.classList.contains('panel-open')).toBe(false);
    });

    it('hamburger toggles the expansion menu', async () => {
        const menu = document.getElementById('menu-container')!;
        expect(menu.classList.contains('visible')).toBe(false);
        document.getElementById('hamburger-link')!.click();
        await tick();
        expect(menu.classList.contains('visible')).toBe(true);
    });

    it('opening the info panel marks the container panel-open and the panel visible', async () => {
        document.getElementById('i-infobox-trigger')!.click();
        await tick();
        expect(document.getElementById('i-infobox')!.classList.contains('visible')).toBe(true);
        expect(document.querySelector('.cim-container')!.classList.contains('panel-open')).toBe(true);
    });

    it('home button closes the open panel', async () => {
        document.querySelector('#home-button a')!.dispatchEvent(new Event('click', { bubbles: true }));
        await tick();
        expect(document.getElementById('i-infobox')!.classList.contains('visible')).toBe(false);
        expect(document.querySelector('.cim-container')!.classList.contains('panel-open')).toBe(false);
    });

    it('opening the profile panel renders the switcher with an add button', async () => {
        document.getElementById('profile-infobox-trigger')!.click();
        await tick();
        expect(document.getElementById('profile-info-container')!.classList.contains('visible')).toBe(true);
        expect(document.querySelector('#profile-switcher .switcher-add')).not.toBeNull();
    });

    it('a full play / guess / next cycle updates the score', async () => {
        // Close any open panel back to the game view.
        document.querySelector('#home-button a')!.dispatchEvent(new Event('click', { bubbles: true }));
        await tick();

        const w = window as unknown as Record<string, () => unknown>;
        const correct = () => (w.__bsharp_correct_color as () => string)();

        // play_audio flips the "audio played" gate via a timeout (the cached
        // <audio> element is detached in jsdom and never fires 'ended').
        (w.play_audio as () => void)();
        await new Promise((r) => setTimeout(r, 800));

        const target = correct();
        const flag = document.querySelector(`div[data-color="${target}"] > div.flag`) as HTMLElement;
        // Game controls use inline onclick attributes, which jsdom does not
        // execute; call the exposed handler directly.
        (w.select_flag as (el: HTMLElement) => void)(flag);
        await tick();

        expect(document.getElementById('stats-total')!.textContent).toBe('1');
        expect(document.getElementById('stats-correct')!.textContent).toBe('1');
        expect(flag.classList.contains('flag-correct')).toBe(true);
    });
});
