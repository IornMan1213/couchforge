# 4. iPhone / Viewer Setup

## Requirements

- iPhone/iPad on the **same Tailscale network** as the PC
- Safari is fine (WebRTC path)
- PC host already running (`npm start`)

## Step 1 — Confirm Tailscale

On the PC, Tailscale IP looks like `100.x.x.x` (shown in the CouchForge console under **Network:**).

On the iPhone, Tailscale app should show **Connected**.

## Step 2 — Open CouchForge

In Safari:

```text
http://100.x.x.x:3090
```

Use **http** not https. There is no TLS certificate in v0.1.

If the page does not load, see [Networking](07-networking.md).

## Step 3 — Join

1. Enter the **6-letter code** from the PC
2. Prefer **Path → Compat (WebRTC)** or **Auto**
3. Set **Control** (e.g. Touchpad tap to click)
4. Tap **Join Session**

## Step 4 — Approve screen share on the PC

The **PC** must allow capture. The phone cannot do this step.

## iOS quirks

| Topic | Detail |
|-------|--------|
| **No MPEG-TS** | Safari does not play CouchForge Hardware MPEG-TS path reliably → client forces **WebRTC** on iPhone |
| **Autoplay** | Video element is muted so autoplay is allowed; PC speakers/headset still play PC audio |
| **Sleep** | Wake Lock is requested; iOS may still dim — keep Safari in foreground |
| **Cache** | After `git pull`, force-reload or clear tab so new `client.js` loads |
| **Address bar** | Fullscreen button in the HUD helps |

## HUD buttons (while streaming)

- **Fullscreen** — immersive view
- **Keyboard** — on-screen keys sent to the PC
- **Stats** — RTT, path, mode
- **Exit** — leave session

## Audio design

CouchForge streams **video only** by design for the “YouTube on PC, sound in PC headset” use case. The phone does not need to play audio.
