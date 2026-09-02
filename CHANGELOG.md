# Changelog

All notable changes to CouchForge are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

---

## [0.2.0] — 2026-09-02

First tagged **main release** focused on daily-driver UX: stable rooms, live settings, installers, and docs.

### Added

- **Fixed room codes + remember device**
  - Default room `COUCH1` (not a random code every session)
  - Saved in browser localStorage on PC and phone
  - **Remember this room** checkbox
  - **Join remembered room** one-tap button
- **Live settings while streaming**
  - HUD **Settings**: Control mode, pointer speed, Quality, Codec
  - Control/speed apply immediately
  - **Apply encode** restarts FFmpeg without leaving the session
- **Installers** under `installers/`
  - Windows: `Install-CouchForge.cmd` / `.ps1` (download, npm, FFmpeg helper, Desktop launcher)
  - Linux: `install.sh`
  - macOS: `install.sh` + `.command` launcher
- **GitHub Actions** release workflow (publishes install scripts on tag `v*`)
- Expanded **docs/** wiki and deeper troubleshooting

### Changed

- Version **0.2.0**
- Random session code replaced by stable **room name**

### Fixed (from 0.1.x)

- iPhone black screen (WebRTC on join)
- Encoder DXGI failures (gdigrab-first)
- Touchpad always-click; hold-to-drag option
- Auto codec prefers H.264

### Known limitations

- HW MPEG-TS not for iOS Safari
- Installers require Node.js 18+ (Windows can winget-install)
- Native single-file `.exe` with embedded Node/robotjs not shipped yet — use Windows installer script
- Room codes are convenience; use Tailscale for security

---

## [0.1.x] — 2026-09 — Foundation

Hardware encode, WebRTC compat, robotjs input, auto FFmpeg, Tailscale-friendly host.
