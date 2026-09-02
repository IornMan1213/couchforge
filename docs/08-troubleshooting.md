# 8. Troubleshooting

Work top to bottom. After code updates: `git pull`, restart `npm start`, hard-refresh the phone.

---

## No video (black screen)

**But touch still works** — classic case: input channel up, video not.

### Checklist

1. **PC must Allow screen share** when the phone joins (Chrome Share dialog).
2. Status on PC should include **WebRTC connected**.
3. Phone: use `http://100.x.x.x:3090`, hard-refresh after updates.
4. On iPhone, Hardware MPEG-TS will not play — WebRTC is required (automatic on iOS in current builds).
5. If you dismissed screen share, **Exit**, start host again, join again, and **Share**.

### Host log clues

| Log | Meaning |
|-----|---------|
| `producing data…` | FFmpeg HW encode is working (separate from WebRTC) |
| `Screen share cancelled` | No WebRTC video |
| `robotjs loaded` | Input can work |

### FFmpeg test (Hardware path)

```bat
ffmpeg -f gdigrab -framerate 30 -i desktop -t 3 -c:v h264_nvenc -preset p4 -b:v 5M -y %TEMP%\test.mp4
```

If this fails, use **Compat** only until FFmpeg/GPU is fixed.

---

## Encoder fails or exits

### `Impossible to convert ... src: d3d11`

Old builds used `ddagrab` + software scale without `hwdownload`. **Update** to latest `main` (`git pull`). Current code prefers **gdigrab** first.

### `exited ... bytes= 0`

Encoder produced nothing — try:

- Codec **H.264**
- Ensure GPU drivers are current
- Run the gdigrab test command above
- Fall back to Compat WebRTC

### `producing data…` then later `SIGTERM`

Often the session restarted or host navigated away — normal if you stopped the session.

### Default encoder still AV1 on very old clone

`git pull` — Auto now prefers H.264 for browser friendliness.

---

## Every touch clicks

You are on an old client, or still expecting old behavior.

1. `git pull` and restart host
2. Hard-refresh phone
3. Set **Control → Touchpad (tap to click)**
4. Slide should **move only**; short **tap** clicks

Need drag: **Touchpad (hold to drag)** — hold ~0.2s then move.

Details: [Controls](05-controls.md).

---

## No mouse / keyboard response

1. Console must say `[input] robotjs loaded`
2. Reinstall: `npm install robotjs`
3. Windows: install C++ Build Tools if compile failed
4. Confirm you are the **viewer** in an active session

---

## Phone cannot open the page

See [Networking](07-networking.md).

Quick checks:

- Tailscale Connected on both devices
- URL is `http://100.x.x.x:3090`
- `npm start` still running
- Firewall allows Node on 3090

---

## Session not found

- Code is case-insensitive but must match the **current** host session
- Restarting the host creates a **new** code
- Host browser tab must still be in the session

---

## High latency / stutter

1. Prefer Tailscale direct (not DERP relay) — check Tailscale admin for relay
2. Quality → **Low latency**
3. Lower phone Safari energy constraints (charge phone, low power mode off)
4. Close heavy PC GPU apps competing with encode
5. 5 GHz Wi-Fi for the phone if possible

---

## robotjs / npm errors

```text
npm ERR! gyp ...
```

Install **Visual Studio Build Tools** with C++ workload, then:

```bat
npm install robotjs
```

---

## Still stuck

1. Copy the **full** `npm start` console from start through the failed join
2. Note: PC browser message, phone message, Path/Control settings
3. Confirm `git log -1` is recent on the PC

Open an issue on the GitHub repo with that info.
