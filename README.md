# CouchForge

From-scratch **local game/desktop streamer** with a **hardware encode path** (NVENC / AMF / Quick Sync via FFmpeg) and the control features from Couch Share.

Sunshine-inspired foundation — not a drop-in Sunshine replacement yet, but a real starting point you can grow.

## What you get (v0.1)

- **Hardware encode path**: FFmpeg `ddagrab` (DXGI) or `gdigrab` → `h264_nvenc` / `h264_amf` / `h264_qsv` / `libx264`
- **Low-latency presets**: Low latency · Balanced · High quality
- **Compat path**: WebRTC (works better on iPhone Safari)
- **Touchpad / touchscreen** control
- **Virtual keyboard**, long-press right-click, two-finger scroll
- **Gamepad** → keyboard mapping on the host
- **Tailscale-friendly** (bind `0.0.0.0`, join by Tailscale IP)
- Session codes, stats, wake lock, reconnection

## Requirements (host PC)

- Windows 10/11
- Node.js 18+
- **FFmpeg** in PATH (build with NVENC/AMF/QSV preferred)
  - https://www.gyan.dev/ffmpeg/builds/ or BtbN builds
- Optional: `npm install robotjs` for mouse/keyboard injection

## Quick start

```bash
git clone https://github.com/IornMan1213/couchforge.git
cd couchforge
npm install
npm install robotjs   # recommended on Windows
npm start
```

Open `http://localhost:3090` on the PC → **Start Host**.

On iPhone (Tailscale connected): open `http://<tailscale-ip>:3090` → enter code → Join.

- Prefer **Compat (WebRTC)** on iPhone if the hardware MPEG-TS path does not play.
- Prefer **Hardware** on desktop Chrome when FFmpeg + GPU encoder are working.

## Paths

| Path | Encode | Best on |
|------|--------|---------|
| Hardware | FFmpeg GPU (or x264) → MPEG-TS over Socket.IO | Desktop browsers with MSE |
| Compat | Browser `getDisplayMedia` → WebRTC | iPhone Safari, easy setup |
| Auto | Chooses HW when available (skips HW on iOS) | Default |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Roadmap (toward Sunshine-class)

1. Native DXGI + NVENC service (no FFmpeg process)
2. ViGEm virtual Xbox controller
3. Desktop audio capture + sync
4. Stronger live transport (custom UDP / WHEP)
5. Optional Moonlight protocol compatibility

## Relation to Couch Share

[Couch Share](https://github.com/IornMan1213/couch-share) is the lightweight WebRTC-only tool.  
**CouchForge** is the new project aimed at hardware acceleration and gaming-oriented streaming.

## License

MIT — use, fork, strip features as you like.
