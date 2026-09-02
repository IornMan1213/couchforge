# 9. FAQ

## General

### What is CouchForge?

A self-hosted desktop/game streamer for local/Tailscale use: PC encodes or captures the screen, phone views and controls it. Inspired by Sunshine/Steam Link goals, implemented as a Node + browser stack you can hack on.

### How is it different from Couch Share?

| | Couch Share | CouchForge |
|--|-------------|------------|
| Port | 3080 | 3090 |
| Focus | Simple WebRTC | HW encode + WebRTC + more controls |
| FFmpeg | No | Optional / auto download |
| Status | Great for “works now” | Evolving toward gaming features |

### Is this a Sunshine replacement?

Not yet. Sunshine is mature C++ with a custom protocol, ViGEm, etc. CouchForge is a foundation with working remote desktop control and a real HW encode pipeline to build on.

### Does it work without Tailscale?

Yes on the same LAN using `192.168.x.x:3090`. Tailscale is recommended for encryption and use away from home without port forwarding.

---

## Video and audio

### Why is there no sound on the phone?

By design. Audio stays on the PC (speakers/headset) so couch YouTube/games keep normal PC audio. Video-only also avoids sync fights on the phone.

### Why must I share the screen in Chrome?

WebRTC (required for iPhone) uses the browser capture API. FFmpeg capture is separate and does not feed Safari.

### Can I use AV1?

You can select AV1 for the **Hardware** encode path if your GPU supports it. **iPhone viewing** still uses WebRTC, not AV1 MPEG-TS. Prefer **H.264** for fewer surprises.

---

## Input

### Why did every touch click before?

Older client sent `click` on every `touchend`. Current **Touchpad (tap to click)** only clicks on short taps without movement.

### How do I drag windows / scrollbars?

**Control → Touchpad (hold to drag)**: hold briefly, then move. Or use **Touchscreen** mode.

### Does a physical keyboard on the phone work?

Hardware keyboards may send key events depending on iOS/Safari; the on-screen **Keyboard** HUD is the supported path.

---

## Install and updates

### Do I need FFmpeg?

Only for the Hardware path. **Compat (WebRTC)** works without it. Auto-download runs on `npm install`.

### `npm install` finished but FFmpeg missing?

```bat
npm run ensure-ffmpeg
```

Or install a system build and add it to PATH.

### Updates break the phone until I refresh?

Yes — browsers cache `client.js`. Close the tab or force reload after `git pull`.

---

## Security

### Is the session encrypted?

Tailscale provides encrypted transport between devices. The app itself does not add a password UI in v0.1; protect access via Tailscale ACLs and by not exposing port 3090 publicly.

### Can someone else control my PC?

Anyone who can open the host URL and join an active session code can view/control. Do not leave sessions idle on untrusted networks.
