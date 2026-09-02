#!/usr/bin/env bash
set -euo pipefail
VERSION="${COUCHFORGE_VERSION:-0.2.0}"
REPO="IornMan1213/couchforge"
INSTALL_ROOT="${HOME}/Applications/CouchForge"
APP_DIR="${INSTALL_ROOT}/app"

echo "========================================"
echo "  CouchForge macOS installer v${VERSION}"
echo "========================================"

if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 18+ from https://nodejs.org or: brew install node"
  exit 1
fi
echo "Node: $(node -v)"

TMP="$(mktemp -d)"
ZIP="${TMP}/couchforge.zip"
URL="https://github.com/${REPO}/archive/refs/tags/v${VERSION}.zip"
FB="https://github.com/${REPO}/archive/refs/heads/main.zip"

echo "Downloading..."
if ! curl -fsSL "$URL" -o "$ZIP"; then
  echo "Tag zip missing; using main."
  curl -fsSL "$FB" -o "$ZIP"
fi

rm -rf "$APP_DIR"
mkdir -p "$INSTALL_ROOT"
unzip -q "$ZIP" -d "$TMP/extract"
INNER="$(find "$TMP/extract" -mindepth 1 -maxdepth 1 -type d | head -1)"
mv "$INNER" "$APP_DIR"

cd "$APP_DIR"
npm install
npm install robotjs --no-save || echo "robotjs optional"

cat > "${INSTALL_ROOT}/Start CouchForge.command" << LAUNCH
#!/bin/bash
cd "${APP_DIR}"
node host/index.js
LAUNCH
chmod +x "${INSTALL_ROOT}/Start CouchForge.command"

echo
echo "Installed to ${APP_DIR}"
echo "Double-click: ${INSTALL_ROOT}/Start CouchForge.command"
echo "Open http://localhost:3090  Room: COUCH1"
