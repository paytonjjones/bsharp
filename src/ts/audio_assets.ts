// Map of chord audio filename (e.g. "ceg_red_long.mp3") to its bundled URL.
// Importing the files through Vite means they are processed by the build and,
// thanks to the high assetsInlineLimit, embedded as data URLs in the single
// output file.
const chordModules = import.meta.glob('../../static/chords/*.mp3', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>;

const CHORD_AUDIO_URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(chordModules)) {
    const filename = path.split('/').pop()!;
    CHORD_AUDIO_URLS[filename] = url;
}

export function chordAudioUrl(filename: string): string {
    return CHORD_AUDIO_URLS[filename] ?? '';
}
