# 1. Getting Started

Goal: stream your Windows desktop to an iPhone on the same Tailscale network, with touch control.

## Prerequisites checklist

- [ ] Windows 10/11 PC
- [ ] Node.js 18+ installed ([nodejs.org](https://nodejs.org))
- [ ] Git installed (optional but recommended)
- [ ] Phone and PC on the **same Tailscale tailnet**
- [ ] Chrome or Edge on the PC (for screen share)

## Step 1 — Install CouchForge on the PC

```bat
cd %USERPROFILE%\Downloads
git clone https://github.com/IornMan1213/couchforge.git
cd couchforge
npm install
npm install robotjs
```

`npm install` runs a postinstall script that tries to find or download FFmpeg. If you already have FFmpeg on PATH, it will use that.

## Step 2 — Start the host

```bat
npm start
```

You should see something like:

```text
[host] Default encoder: NVIDIA H.264 (NVENC)
CouchForge host running
Local:   http://localhost:3090
Network: http://100.x.x.x:3090
```

Note your **Tailscale IP** (usually starts with `100.`).

## Step 3 — Start a session on the PC

1. Open **Chrome/Edge** → `http://localhost:3090`
2. Leave **Path** on **Auto** (or **Compat** if you only care about the phone)
3. Set **Control** to **Touchpad (tap to click)**
4. Click **Start Host (PC)**
5. Copy the **6-character session code**

## Step 4 — Join from the iPhone

1. Open Safari → `http://YOUR_TAILSCALE_IP:3090`
   Example: `http://100.104.65.35:3090`
2. Enter the session code → **Join Session**
3. On the **PC**, when prompted, **Allow screen share** (share entire screen)
4. PC status should say **WebRTC connected — phone can view**
5. Phone should show the desktop; touch moves the cursor

## Step 5 — Basic control

| Gesture | Touchpad (tap to click) |
|---------|-------------------------|
| Slide finger | Move cursor only |
| Short tap | Left click |
| Long press (~0.5s) | Right click |
| Two-finger drag up/down | Scroll wheel |
| **Keyboard** button | On-screen keys |

For click-and-drag (scrollbars, selecting text), switch **Control** to **Touchpad (hold to drag)** before joining, or see [Controls](05-controls.md).

## Success criteria

- [ ] Video visible on phone
- [ ] Sliding moves cursor **without** clicking every time
- [ ] Short tap clicks
- [ ] You can open apps / YouTube on the PC from the couch

If something fails, go to [Troubleshooting](08-troubleshooting.md).
