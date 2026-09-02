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

Encoder produced nothing — try Codec **H.264**, update GPU drivers, run gdigrab test, or Compat WebRTC.

### Default encoder still AV1 on very old clone

`git pull` — Auto now prefers H.264.

---

## Every touch clicks

1. `git pull` and restart host
2. Hard-refresh phone
3. Set **Control → Touchpad (tap to click)** or use live **Settings** while streaming
4. Slide should **move only**; short **tap** clicks

Need drag: **Touchpad (hold to drag)** — or HUD Settings while connected.

---

## No mouse / keyboard response

1. Console must say `[input] robotjs loaded`
2. `npm install robotjs`
3. C++ Build Tools if compile failed

---

## Phone cannot open the page

See [Networking](07-networking.md). Tailscale Connected, `http://100.x.x.x:3090`, firewall TCP 3090.

---

## Session not found

Code must match the **current** host session. Restarting host creates a new code.

---

## High latency / stutter

Tailscale direct path, Quality **Low latency**, charge phone, 5 GHz Wi-Fi, close heavy GPU apps.

---

## Deep dive: black screen playbook

1. PC is host tab + `npm start`; phone only Joins.
2. When phone joins, PC Chrome must **Share** entire screen.
3. PC status: `WebRTC connected — phone can view`.
4. Hard-refresh phone after every `git pull`.
5. URL is `http://100.x.x.x:3090` with Tailscale Connected.
6. Firewall allows TCP 3090 for Node.
7. Missing robotjs does not cause black video; missing screen share does.

| Host log | Meaning | Action |
|----------|---------|--------|
| `producing data…` | FFmpeg HW alive | Phone still needs WebRTC share |
| `Screen share cancelled` | Capture denied | Share again |
| No viewer-joined | Phone never joined | Check code/IP |

## Deep dive: testing AV1 without reconnecting

1. Stay in session → HUD **Settings**.
2. Codec → **AV1** → **Apply encode**.
3. Watch host log for `av1_nvenc` or fallback.
4. Phone picture is still WebRTC (browser capture), not AV1 decode. AV1 applies to the Hardware MPEG-TS pipeline.
5. If encode fails (`bytes=0`), Apply **H.264** without leaving the session.

## Deep dive: input

| Feeling | Fix |
|---------|-----|
| Click on every lift | Update client; Touchpad (tap) |
| Cannot drag | Settings → Touchpad (hold to drag) |
| Cursor speed wrong | Settings → Speed |
| No movement | `npm install robotjs`, restart host |

## Cannot change settings without reconnecting

Use HUD **Settings** while streaming. Control/speed are instant; encode uses **Apply encode**.
