# CouchForge

From-scratch **local game/desktop streamer** with hardware encode (FFmpeg NVENC/AMF/QSV) and browser control from your phone — Tailscale-friendly.

Inspired by Sunshine / Steam Link goals. Not a drop-in Sunshine replacement yet; a foundation you can run today and extend.

---

## Wiki (start here for problems)

**Full documentation, step-by-step guides, FAQ, and troubleshooting:**

### [CouchForge Wiki (docs/)](docs/README.md)

Also: https://github.com/IornMan1213/couchforge/wiki (enable Wikis in repo Settings if empty; mirror from `docs/`).

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
| **Changelog** | [CHANGELOG.md](CHANGELOG.md) |

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

**iPhone:** video uses **WebRTC**.  
**Control:** **Touchpad (tap to click)** — or change anytime via HUD **Settings**.

Default port: **3090**.

### Live settings (no reconnect)

While streaming, open **Settings** on the HUD:

- **Control** / **Speed** — apply immediately (tap vs hold-to-drag, sensitivity)
- **Quality** / **Codec** — tap **Apply encode** to restart FFmpeg without leaving the session (test AV1, etc.)

### Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of fixes and features.

---

## Features (v0.1)

- Hardware encode + Compat WebRTC for iPhone
- Auto FFmpeg download, robotjs input
- Touchpad / hold-to-drag / touchscreen + live settings
- Virtual keyboard, scroll, stats, Tailscale-friendly

## License

MIT
