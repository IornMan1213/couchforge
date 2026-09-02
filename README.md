# CouchForge

**v0.2.0** — Local hardware-accelerated desktop/game streamer (Sunshine-inspired). Control your Windows PC from an iPhone over Tailscale.

---

## Installers (no full repo clone)

Download from **[Releases](https://github.com/IornMan1213/couchforge/releases)** after tag `v0.2.0` is published:

| OS | File |
|----|------|
| **Windows** | `Install-CouchForge.cmd` (+ `Install-CouchForge.ps1`) — double-click |
| **Linux** | `CouchForge-linux-install.sh` |
| **macOS** | `CouchForge-macos-install.sh` |

Scripts also live in-repo: [installers/](installers/) · [installers/README.md](installers/README.md)

Windows installs to `%LOCALAPPDATA%\CouchForge` and puts **Start CouchForge** on the Desktop.

> A single native `.exe` with Node + robotjs embedded is not shipped yet (native addon limits). The Windows installer is the supported one-click path.

---

## Quick start (from source)

```bat
git clone https://github.com/IornMan1213/couchforge.git
cd couchforge
npm install
npm install robotjs
npm start
```

1. PC: `http://localhost:3090` → room **COUCH1** → **Start Host**
2. Allow screen share when the phone joins
3. Phone: `http://<tailscale-ip>:3090` → **Join COUCH1** (remembered after first time)

Port **3090**. Live **Settings** while streaming (control / codec without reconnect).

---

## Wiki

[docs/README.md](docs/README.md) · [CHANGELOG.md](CHANGELOG.md)

---

## Features

- Hardware encode (NVENC/AMF/QSV) + WebRTC for iPhone
- Fixed room codes + remember device
- Touchpad / hold-to-drag / touchscreen
- Live settings, virtual keyboard, Tailscale-friendly

## License

MIT
