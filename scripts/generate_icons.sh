#!/usr/bin/env bash
#
# Generate Android mipmap icons and Play Store icon from the vector drawable.
# Requires: rsvg-convert (librsvg), magick (ImageMagick)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RES_DIR="$PROJECT_DIR/android/app/src/main/res"

INTERMEDIATE_SIZE=1024
PLAYSTORE_SIZE=512

# Check dependencies
for cmd in rsvg-convert magick; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "ERROR: $cmd not found. Install with: brew install ${cmd/magick/imagemagick}" >&2
        exit 1
    fi
done

TMPDIR_ICONS="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_ICONS"' EXIT

SVG_FILE="$TMPDIR_ICONS/icon.svg"
INTERMEDIATE_PNG="$TMPDIR_ICONS/icon_${INTERMEDIATE_SIZE}.png"

# Build SVG from the vector drawable paths.
# The vector drawable uses a 108x108 viewport with a group transform:
#   scaleX/Y=0.78, pivotX/Y=54, translateY=3
# SVG equivalent: translate(54,54) scale(0.78) translate(-54,-54) then translate(0,3)
# Simplified: translate(54*(1-0.78), 54*(1-0.78)+3) scale(0.78) = translate(11.88, 14.88) scale(0.78)
cat > "$SVG_FILE" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <rect width="108" height="108" fill="#7B1FA2"/>
  <g transform="translate(11.88, 14.88) scale(0.78)">
    <!-- Mirrored eighth note -->
    <path fill="#FFFFFF" d="M67.2,84.8 C72.4,80.4 69.8,73.4 59.7,71.4 C56.2,70.5 53.1,70.3 48.7,70.9 C46.0,71.6 45.5,72.9 45.5,72.9 C45.5,55.1 45.6,25.0 45.6,10.2 C44.7,10.2 44.1,10.1 42.9,10.1 C42.9,11.0 42.9,11.7 42.9,12.4 C42.9,13.2 42.9,13.6 42.8,14.1 C41.9,19.7 40.7,21.9 34.5,28.7 C26.7,37.4 24.4,42.6 24.4,49.5 C24.5,56.0 30.2,69.9 31.4,69.4 C29.7,64.5 27.2,59.2 26.6,54.8 C25.8,49.4 28.0,41.9 31.5,37.9 C34.3,34.6 41.0,31.6 42.9,31.6 C42.9,31.6 43.0,63.7 43.0,76.4 C43.0,79.5 43.8,83.9 45.2,85.2 C50.0,90.1 62.8,89.2 67.2,84.8z"/>
    <!-- Ledger line -->
    <path fill="#FFFFFF" d="M37,70.5 L73,70.5 Q74,70.5 74,71.5 L74,71.7 Q74,72.7 73,72.7 L37,72.7 Q36,72.7 36,71.7 L36,71.5 Q36,70.5 37,70.5z"/>
    <!-- Sharp: vertical bar 1 -->
    <path fill="#FFFFFF" d="M73.8,36 L74.5,36 Q75.3,36 75.3,36.8 L75.3,61.2 Q75.3,62 74.5,62 L73.8,62 Q73,62 73,61.2 L73,36.8 Q73,36 73.8,36z"/>
    <!-- Sharp: vertical bar 2 -->
    <path fill="#FFFFFF" d="M83.3,33 L84.0,33 Q84.8,33 84.8,33.8 L84.8,58.2 Q84.8,59 84.0,59 L83.3,59 Q82.5,59 82.5,58.2 L82.5,33.8 Q82.5,33 83.3,33z"/>
    <!-- Sharp: horizontal bar 1 -->
    <path fill="#FFFFFF" d="M69.5,41.8 L88.2,38.3 Q89.0,38.1 89.3,38.9 L89.8,40.6 Q90.0,41.4 89.2,41.6 L70.5,45.1 Q69.7,45.3 69.4,44.5 L68.9,42.8 Q68.7,42.0 69.5,41.8z"/>
    <!-- Sharp: horizontal bar 2 -->
    <path fill="#FFFFFF" d="M69.5,51.8 L88.2,48.3 Q89.0,48.1 89.3,48.9 L89.8,50.6 Q90.0,51.4 89.2,51.6 L70.5,55.1 Q69.7,55.3 69.4,54.5 L68.9,52.8 Q68.7,52.0 69.5,51.8z"/>
  </g>
</svg>
SVGEOF

echo "Rendering intermediate PNG (${INTERMEDIATE_SIZE}x${INTERMEDIATE_SIZE})..."
rsvg-convert -w "$INTERMEDIATE_SIZE" -h "$INTERMEDIATE_SIZE" "$SVG_FILE" -o "$INTERMEDIATE_PNG"

# Generate mipmap PNGs for each density
for entry in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
    density="${entry%%:*}"
    size="${entry##*:}"
    dir="$RES_DIR/mipmap-$density"
    mkdir -p "$dir"

    echo "  mipmap-$density: ${size}x${size}"

    # Square icon
    magick "$INTERMEDIATE_PNG" -resize "${size}x${size}" "$dir/ic_launcher.png"

    # Round icon (circular clip)
    magick "$INTERMEDIATE_PNG" -resize "${size}x${size}" \
        \( -size "${size}x${size}" xc:none -fill white -draw "circle $((size/2)),$((size/2)) $((size/2)),0" \) \
        -compose CopyOpacity -composite \
        "$dir/ic_launcher_round.png"
done

# Play Store icon (512x512, square — Google applies adaptive masking)
echo "  Play Store: ${PLAYSTORE_SIZE}x${PLAYSTORE_SIZE}"
magick "$INTERMEDIATE_PNG" -resize "${PLAYSTORE_SIZE}x${PLAYSTORE_SIZE}" \
    "$PROJECT_DIR/android/playstore-icon.png"

echo "Done. Generated icons:"
ls -la "$RES_DIR"/mipmap-*/ic_launcher*.png "$PROJECT_DIR/android/playstore-icon.png"
