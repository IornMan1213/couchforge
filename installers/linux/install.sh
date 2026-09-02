#!/usr/bin/env bash
set -euo pipefail
VERSION="${COUCHFORGE_VERSION:-0.2.0}"
REPO="IornMan1213/couchforge"
INSTALL_ROOT="${HOME}/.local/share/couchforge"
APP_DIR="${INSTALL_ROOT}/app"

echo "========================================"
echo "  CouchForge Linux installer v${VERSION}"
echo "========================================"

need_cmd() { command -v "$1" >/dev/null 2>&1; }

if ! need_cmd node; then
  echo "Node.js 18+ is required. Install via nvm, nodesource, or your package manager."
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
npm install robotjs --no-save || echo "robotjs optional — may need build tools"

mkdir -p "${HOME}/.local/bin"
cat > "${HOME}/.local/bin/couchforge" << LAUNCH
#!/usr/bin/env bash
cd "${APP_DIR}"
exec node host/index.js "\$@"
LAUNCH
chmod +x "${HOME}/.local/bin/couchforge"

echo
echo "Installed to ${APP_DIR}"
echo "Run: couchforge   (if ~/.local/bin is on PATH)"
echo "  or: cd ${APP_DIR} && npm start"
echo "Open http://localhost:3090  Room: COUCH1"
