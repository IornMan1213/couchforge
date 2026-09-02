# CouchForge

From-scratch **local game/desktop streamer** with a **hardware encode path** (AV1 / HEVC / H.264 via NVENC, AMF, QSV) and the control features from Couch Share.

Sunshine-inspired foundation — not a drop-in Sunshine replacement yet, but a real starting point you can grow.

## What you get (v0.1)

- **Hardware encode path**: FFmpeg `ddagrab` (DXGI) or `gdigrab` → **AV1** / HEVC / H.264 (NVENC, AMF, QSV) with software fallbacks
- **Low-latency presets**: Low latency · Balanced · High quality
- **Codec preference**: Auto (prefer AV1) · AV1 · HEVC · H.264
- **Compat path**: WebRTC (works better on iPhone Safari)
- **Touchpad / touchscreen** control
- **Virtual keyboard**, long-press right-click, two-finger scroll
- **Gamepad** → keyboard mapping on the host
- **Tailscale-friendly** (bind `0.0.0.0`, join by Tailscale IP)
- Session codes, stats, wake lock, reconnection

## Requirements (host PC)

- Windows 10/11
- Node.js 18+
- **FFmpeg** in PATH (build with NVENC/AMF/QSV preferred; AV1 if your GPU supports it)
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
- Prefer **Hardware** on desktop Chrome when FFmpeg + your GPU encoder are working.

### Codecs

| Preference | What is used |
|------------|----------------|
| **Auto** | Prefers **AV1** (nvenc/amf/qsv), then HEVC, then H.264 |
| **AV1** | Force AV1 when FFmpeg reports `av1_nvenc`, `av1_amf`, `av1_qsv`, or software SVT/libaom |
| **HEVC** | `hevc_nvenc` / `hevc_amf` / `hevc_qsv` |
| **H.264** | `h264_nvenc` / `h264_amf` / `h264_qsv` / `libx264` |

AV1 needs a recent GPU (e.g. RTX 40-series NVENC AV1, recent AMD/Intel) and an FFmpeg build with those encoders. Browser decode of live AV1 MPEG-TS is limited on some clients — use **Compat (WebRTC)** on iPhone if the HW path fails.

## Paths

| Path | Encode | Best on |
|------|--------|---------|
| Hardware | FFmpeg GPU (or software) → MPEG-TS over Socket.IO | Desktop browsers with MSE |
| Compat | Browser `getDisplayMedia` → WebRTC | iPhone Safari, easy setup |
| Auto | Chooses HW when available (skips HW on iOS) | Default |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Roadmap (toward Sunshine-class)

1. Native DXGI + NVENC/AV1 service (no FFmpeg process)
2. ViGEm virtual Xbox controller
3. Desktop audio capture + sync
4. Stronger live transport (custom UDP / WHEP)
5. Optional Moonlight protocol compatibility

## Relation to Couch Share

[Couch Share](https://github.com/IornMan1213/couch-share) is the lightweight WebRTC-only tool.  
**CouchForge** is the new project aimed at hardware acceleration and gaming-oriented streaming.

## License

MIT — use, fork, strip features as you like.
