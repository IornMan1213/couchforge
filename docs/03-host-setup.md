# 3. Host PC Setup

## Starting the server

```bat
cd %USERPROFILE%\Downloads\couchforge
npm start
```

Leave this window open. Stopping it ends all sessions.

## Open the host UI

On the **same PC**, use Chrome or Edge:

```text
http://localhost:3090
```

Do **not** use only the phone to start hosting; screen share must be approved on the PC.

## Host settings (before Start Host)

### Path

| Setting | Meaning |
|---------|---------|
| **Auto** | Starts FFmpeg encode when available; still offers WebRTC when a viewer joins |
| **Hardware (FFmpeg)** | Emphasizes MPEG-TS path (desktop browsers) |
| **Compat (WebRTC)** | Browser capture only — **best for iPhone** |

For phone-first use, **Compat** or **Auto** both work after recent fixes: when a viewer joins, the host asks for **screen share**.

### Quality

| Preset | Typical use |
|--------|-------------|
| Low latency | Snappier control, lower resolution/bitrate |
| Balanced | Default, good for YouTube / desktop |
| High quality | Sharper, more bandwidth / GPU load |

### Codec

| Setting | Notes |
|---------|--------|
| **Auto** | Prefers **H.264** for browser-friendly streaming |
| **H.264** | Best compatibility (recommended) |
| **HEVC / AV1** | Fine for encode tests; many phones cannot play live AV1/HEVC MPEG-TS — use WebRTC for viewing |

### Control

See [Controls](05-controls.md). Set this on the **phone** before Join as well (stored in the phone browser localStorage).

## Start Host flow

1. Click **Start Host (PC)**
2. Note the **session code** (e.g. `R5WQE0`)
3. Optional: **Copy**
4. Wait for a viewer

When the phone joins:

1. Windows/Chrome shows **Share your screen**
2. Choose **Entire screen** (recommended) or a window
3. Click **Share**
4. Status: **WebRTC connected — phone can view**

If you cancel screen share, the phone may still send touch events but **will not** get video.

## What the host console should show

Healthy example:

```text
[host] FFmpeg: C:\...\ffmpeg.exe
[host] Default encoder: NVIDIA H.264 (NVENC)
session ABC123 default encoder NVIDIA H.264 (NVENC)
[host] starting encode ...
[encoder] gdigrab/h264_nvenc ... producing data…
client ...
```

`producing data…` means FFmpeg is outputting video (Hardware path). WebRTC video is separate and depends on screen share.

## Stopping

- **Exit** on the phone HUD, or
- Close the browser tab on the PC, or
- Ctrl+C in the `npm start` terminal

## Multiple viewers

v0.1 is optimized for **one primary viewer** (your phone). Extra clients may connect but WebRTC is one peer at a time in the current client.
