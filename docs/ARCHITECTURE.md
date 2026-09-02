# CouchForge Architecture

## Goal

A from-scratch, self-hosted streamer aimed at Sunshine/Steam Link territory:

- Hardware encode on the host (**AV1** / HEVC / H.264 via NVENC, AMF, Quick Sync)
- Low-latency capture (DXGI Desktop Duplication via FFmpeg `ddagrab` when available)
- Touchpad / touchscreen / keyboard / gamepad control
- Tailscale-friendly (no port forwarding)
- Browser client on iPhone (Safari) + desktop browsers

## Honest status (v0.1)

| Layer | Status | Notes |
|-------|--------|--------|
| Capture | FFmpeg `ddagrab` / `gdigrab` | Real DXGI path when FFmpeg build supports it |
| Encode | **AV1** / HEVC / H.264 (NVENC, AMF, QSV) + software | Auto prefers AV1; low-latency flags |
| Transport | MPEG-TS over WebSocket + WebRTC fallback | HW path uses TS; compat mode uses WebRTC |
| Decode (client) | MSE / mpegts.js + WebRTC | Safari prefers WebRTC compat mode |
| Mouse/KB | robotjs | Optional native module |
| Gamepad | Browser Gamepad API → key mapping | ViGEm virtual pad is a later milestone |
| Audio | Optional later | Desktop audio capture via dshow/wasapi |

This is a **foundation**, not feature-parity with Sunshine.

## Pipeline (performance mode)

```
Desktop → ddagrab/gdigrab → av1|hevc|h264 (GPU) → MPEG-TS → Socket.IO → MSE → <video>
                ↑
         input events (Socket.IO) → robotjs / gamepad map
```

## Pipeline (compat mode)

```
Browser getDisplayMedia → WebRTC (simple-peer) → Safari/Chrome
```

## AV1 notes

- Host detects `av1_nvenc`, `av1_amf`, `av1_qsv`, `libsvtav1`, `libaom-av1`.
- Auto codec order: AV1 HW → HEVC HW → H.264 HW → software AV1 → x264.
- Bitrate presets use lower rates for AV1 at similar visual quality.
- MPEG-TS + MSE AV1 playback is not universal in every browser; WebRTC compat remains the safe path for iOS Safari until a WebCodecs/fMP4 path is added.

## Roadmap toward Sunshine-class

1. Native DXGI + NVENC/AV1 C++/C# capture service (replace FFmpeg process)
2. True virtual Xbox pad via ViGEmBus
3. Opus audio + sync
4. Optional Moonlight protocol compatibility
5. FEC / custom UDP for lossy Wi-Fi

## Host requirements

- Windows 10/11
- Node.js 18+
- FFmpeg in PATH (builds with nvenc/amf/qsv and optionally av1_* encoders)
- Optional: `npm install robotjs` for input injection
