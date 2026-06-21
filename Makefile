.PHONY: build dev preview check test test-unit test-ui test-integration test-screenshot test-screenshot-update clean generate-audio move-downloaded-chords move-downloaded-notes convert-audio-to-mp3

# Build the static site (single-page web app) into dist/ via Vite.
build:
	npm run build

# Start the Vite dev server with hot reloading.
dev:
	npm run dev

# Preview the production build locally.
preview:
	npm run preview

check:
	npx tsc --noEmit

test-unit:
	npx vitest run

test-ui: build
	npx playwright test --config tests/playwright.config.ts

test: test-unit build
	npx playwright test --config tests/playwright.config.ts

test-integration: build
	npx playwright test --config tests/playwright.integration.config.ts

test-screenshot: build
	npx playwright test --config tests/playwright.screenshot.config.ts

test-screenshot-update: build
	npx playwright test --config tests/playwright.screenshot.config.ts --update-snapshots=all

clean:
	rm -rf dist

# --- Audio generation (one-time, requires browser + ffmpeg) ---

generate-audio:
	@echo "Starting local server for audio generation..."
	@echo "Use the buttons to generate chords, notes, or both."
	@echo "Allow multiple downloads when prompted. Press Ctrl+C when done."
	@sleep 2
	@open "http://localhost:8000/scripts/generate_audio.html" 2>/dev/null || xdg-open "http://localhost:8000/scripts/generate_audio.html" 2>/dev/null || echo "Open http://localhost:8000/scripts/generate_audio.html"
	npx http-server . -p 8000 -c-1

move-downloaded-chords:
	@mkdir -p static/chords
	@if ls ~/Downloads/*_*_*.wav >/dev/null 2>&1; then \
		count=$$(ls ~/Downloads/*_*_*.wav 2>/dev/null | wc -l); \
		mv ~/Downloads/*_*_*.wav static/chords/ && \
		echo "Moved $$count chord WAV files to static/chords/"; \
	else \
		echo "No chord WAV files found in ~/Downloads/"; \
	fi

move-downloaded-notes:
	@mkdir -p static/notes
	@if ls ~/Downloads/*[0-9]_*.wav >/dev/null 2>&1; then \
		count=$$(ls ~/Downloads/*[0-9]_*.wav 2>/dev/null | wc -l); \
		mv ~/Downloads/*[0-9]_*.wav static/notes/ && \
		echo "Moved $$count note WAV files to static/notes/"; \
	else \
		echo "No note WAV files found in ~/Downloads/"; \
	fi

convert-audio-to-mp3:
	@if ! command -v ffmpeg >/dev/null 2>&1; then \
		echo "ERROR: ffmpeg not found. Install with: brew install ffmpeg"; \
		exit 1; \
	fi
	@for dir in static/chords static/notes; do \
		if ls $$dir/*.wav >/dev/null 2>&1; then \
			cd $$dir && \
			for wav in *.wav; do \
				[ -f "$$wav" ] || continue; \
				ffmpeg -i "$$wav" -acodec libmp3lame -b:a 128k "$${wav%.wav}.mp3" -y -loglevel error && rm "$$wav"; \
			done && \
			cd - >/dev/null && \
			echo "Converted $$dir WAVs to MP3"; \
		fi; \
	done
