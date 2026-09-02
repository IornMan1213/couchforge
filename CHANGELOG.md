# Changelog

All notable changes to CouchForge are documented here.

---

## [Unreleased]

### Added

- **Live settings while streaming** — HUD **Settings** panel: change Control mode, pointer speed, Quality, and Codec **without disconnecting** or re-entering the session code.
- **Apply encode** — request `update-encode`; host restarts FFmpeg in place and broadcasts `encode-updated`.
- **Wiki** under `docs/` (Getting Started through Tips, FAQ, Troubleshooting, Architecture).
- **CHANGELOG.md** (this file).

---

## [0.1.x] — 2026-09 — Foundation

### Added

- Node host on port **3090** with Socket.IO signaling.
- **Hardware encode path**: FFmpeg → MPEG-TS over Socket.IO.
  - Capture: `gdigrab` first (Windows), then `ddagrab` with `hwdownload`, then `libx264` fallback.
  - Codecs: H.264 / HEVC / AV1 via NVENC, AMF, QSV; software fallbacks.
- **Compat path**: WebRTC via `getDisplayMedia` + simple-peer (required for iPhone Safari).
- **Auto FFmpeg**: `scripts/ensure-ffmpeg.js` on postinstall / `npm run ensure-ffmpeg` / host startup.
- Session codes; bind `0.0.0.0`.
- Input via **robotjs**: mouse, wheel, keyboard, basic gamepad mapping.
- Control modes: touchpad (tap to click), touchpad (hold to drag), touchscreen.
- Virtual keyboard, two-finger scroll, stats, wake lock.
- Codec and quality UI presets.

### Fixed

- **No video on iPhone**: force WebRTC on iOS; host always offers WebRTC + screen share when a viewer joins.
- **Encoder d3d11 failures**: gdigrab-first pipeline; safer NVENC flags.
- **Default codec AV1**: Auto prefers **H.264** for browser friendliness.
- **Every touch clicked**: touchpad only clicks on short taps with little movement.
- **Black screen while touch worked**: WebRTC peer missing when HW path was active.

### Known limitations

- Hardware MPEG-TS not reliable on iOS Safari (use WebRTC).
- One primary WebRTC viewer in the current client.
- No streamed desktop audio (PC audio stays local by design).
- No ViGEm virtual Xbox controller yet.
- Session codes are not full passwords; use Tailscale ACLs.

---

## Upgrade

```bat
git pull
npm install
npm start
```

Hard-refresh the phone after pull.

### Live settings

HUD → **Settings** while streaming:

| Setting | Effect |
|---------|--------|
| Control | Instant |
| Speed | Instant |
| Quality / Codec | **Apply encode** — host restarts FFmpeg; session stays up |
