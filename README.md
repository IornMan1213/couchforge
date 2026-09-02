# CouchForge

From-scratch **local game/desktop streamer** with hardware encode (FFmpeg NVENC/AMF/QSV) and browser control from your phone — Tailscale-friendly.

Inspired by Sunshine / Steam Link goals. Not a drop-in Sunshine replacement yet; a foundation you can run today and extend.

---

## Wiki (start here for problems)

**Full documentation, step-by-step guides, FAQ, and troubleshooting:**

### [CouchForge Wiki](docs/README.md)

| Topic | Link |
|-------|------|
| Getting started | [docs/01-getting-started.md](docs/01-getting-started.md) |
| Installation | [docs/02-installation.md](docs/02-installation.md) |
| Host PC setup | [docs/03-host-setup.md](docs/03-host-setup.md) |
| iPhone / viewer | [docs/04-iphone-viewer.md](docs/04-iphone-viewer.md) |
| Controls (tap vs drag) | [docs/05-controls.md](docs/05-controls.md) |
| Paths and codecs | [docs/06-paths-and-codecs.md](docs/06-paths-and-codecs.md) |
| Tailscale / network | [docs/07-networking.md](docs/07-networking.md) |
| Troubleshooting | [docs/08-troubleshooting.md](docs/08-troubleshooting.md) |
| FAQ | [docs/09-faq.md](docs/09-faq.md) |
| Tips | [docs/10-tips.md](docs/10-tips.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

---

## Quick start

```bat
git clone https://github.com/IornMan1213/couchforge.git
cd couchforge
npm install
npm install robotjs
npm start
```

1. PC Chrome: `http://localhost:3090` → **Start Host** → copy code
2. When the phone joins, **Allow screen share** on the PC
3. iPhone Safari: `http://<tailscale-ip>:3090` → enter code → **Join**

**iPhone:** video uses **WebRTC** (Safari cannot play the Hardware MPEG-TS path).  
**Control:** **Touchpad (tap to click)** — move without clicking; short tap to click; use **hold to drag** when you need click-drag.

Default port: **3090**.

---

## Features (v0.1)

- Hardware encode path: FFmpeg `gdigrab` / `ddagrab` → H.264 / HEVC / AV1 (NVENC, AMF, QSV) with fallbacks
- Auto FFmpeg detect/download on install (`npm run ensure-ffmpeg`)
- Compat path: WebRTC for iPhone Safari
- Touchpad (tap to click), hold-to-drag, touchscreen
- Virtual keyboard, two-finger scroll, long-press right-click
- Gamepad → key mapping (basic)
- Tailscale-friendly (`0.0.0.0` bind)
- Session codes, stats, wake lock

## Requirements

- Windows 10/11, Node.js 18+
- FFmpeg optional for Compat; recommended for Hardware path
- `robotjs` for mouse/keyboard injection

## Related

[Couch Share](https://github.com/IornMan1213/couch-share) — lighter WebRTC-only app (port 3080).

## License

MIT
