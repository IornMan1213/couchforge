# 6. Paths and Codecs

## Paths

### Compat (WebRTC)

- Capture: browser `getDisplayMedia` on the PC
- Transport: WebRTC (simple-peer)
- **Best for iPhone Safari**
- Does not need FFmpeg for video

### Hardware (FFmpeg)

- Capture: `gdigrab` (preferred on Windows) or `ddagrab`
- Encode: NVENC / AMF / QSV / libx264
- Transport: MPEG-TS chunks over Socket.IO
- Decode: MediaSource in **desktop** Chrome/Edge
- **Not reliable on iOS Safari**

### Auto

- Host may start FFmpeg for desktop HW viewers
- iPhone client still uses WebRTC
- When any viewer joins, host prompts screen share for WebRTC

## Codecs (Hardware path)

| UI choice | Encoder preference |
|-----------|-------------------|
| Auto | H.264 HW → HEVC → AV1 → software |
| H.264 | `h264_nvenc` / AMF / QSV / `libx264` |
| HEVC | `hevc_*` |
| AV1 | `av1_*` / software AV1 |

**Recommendation:** H.264 or Auto for real use. AV1 encode may work on RTX 40-series hosts, but **phone viewing** still goes through WebRTC (browser encode), not AV1 MPEG-TS.

## Encoder fallback chain (host)

1. `gdigrab` + selected codec
2. `ddagrab` + selected codec
3. `gdigrab` + `libx264`

Logs show `producing data…` when bytes are flowing.

## Why audio is not in the stream

CouchForge targets watching/controlling the PC while **PC audio** stays on the PC (headset/speakers). That avoids echo and keeps AV sync on the machine that is playing YouTube/games audio.
