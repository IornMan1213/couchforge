# Changelog

All notable changes to CouchForge are documented here.

---

## [Unreleased]

### Added

- **Fixed room codes + remember device** — default room `COUCH1`, saved on PC and phone in localStorage for long periods; **Join remembered room** one-tap; no random code every session.
- **Live settings while streaming** — HUD **Settings** panel: Control, Speed, Quality, Codec without disconnecting.
- **Apply encode** — restart FFmpeg in place (`update-encode`).
- Wiki under `docs/` and this **CHANGELOG.md**.

### Changed

- Session “password” replaced by a stable **room name** you choose once (e.g. COUCH1).

---

## [0.1.x] — 2026-09 — Foundation

### Added

- Hardware encode + WebRTC compat, robotjs input, touchpad modes, Tailscale-friendly bind.

### Fixed

- iPhone black screen (WebRTC on join), encoder d3d11, always-click touchpad, default AV1 preference.

### Known limitations

- HW MPEG-TS not for iOS Safari; use WebRTC for phones.
- Room code is not a strong secret — use Tailscale ACLs.

---

## Upgrade

```bat
git pull
npm start
```

Hard-refresh the phone. Set room to **COUCH1** on host once; phone remembers after first join.
