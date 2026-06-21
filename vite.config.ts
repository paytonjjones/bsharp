import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// BSharp builds to a folder of static assets: a single index.html that
// references the hashed JS/CSS bundles via <script src>/<link href>, plus the
// chord audio and icon font emitted as static asset files. The output in dist/
// can be served by any static file host.
export default defineConfig({
    root: 'src',
    base: './',
    publicDir: false,
    plugins: [
        tailwindcss(),
    ],
    server: {
        fs: { allow: ['..'] },
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
});
