# Architecture

## Goal

Self-hosted streamer aimed at Sunshine/Steam Link territory:

- Hardware encode on the host (NVENC / AMF / Quick Sync via FFmpeg)
- Low-latency capture (`gdigrab` preferred on Windows; `ddagrab` with hwdownload fallback)
- Touchpad / touchscreen / keyboard / gamepad control
- Tailscale-friendly (bind `0.0.0.0`, no port forwarding required)
- Browser client on iPhone (Safari via WebRTC) + desktop browsers

## Status (v0.1)

| Layer | Status | Notes |
|-------|--------|--------|
| Capture | FFmpeg `gdigrab` / `ddagrab` | gdigrab-first; ddagrab needs hwdownload |
| Encode | H.264 / HEVC / AV1 (NVENC, AMF, QSV) + libx264 | Auto prefers H.264 for browsers |
| Transport | MPEG-TS over Socket.IO + WebRTC | iOS uses WebRTC only |
| Decode | MSE (desktop) / WebRTC (iPhone) | Safari cannot play live MPEG-TS reliably |
| Mouse/KB | robotjs | Optional native module |
| Gamepad | Gamepad API → key map | ViGEm later |
| Audio | Not streamed | Stays on PC devices |

## Pipelines

### Hardware

```text
Desktop → gdigrab/ddagrab → h264_nvenc (etc.) → MPEG-TS → Socket.IO → MSE → <video>
```

### Compat (required for iPhone)

```text
getDisplayMedia → WebRTC (simple-peer) → Safari/Chrome
Input: touch/keyboard → Socket.IO → robotjs
```

## Encoder fallback

1. gdigrab + chosen codec
2. ddagrab + chosen codec
3. gdigrab + libx264

## Roadmap

1. Native DXGI + NVENC service (drop FFmpeg process)
2. ViGEm virtual Xbox controller
3. Optional desktop audio + sync
4. Stronger live transport (custom UDP / WHEP)
5. Optional Moonlight-oriented compatibility

## Repo layout

```text
host/           Node server, encoder, input
public/         Browser UI + client.js
scripts/        ensure-ffmpeg.js
docs/           This wiki
```
