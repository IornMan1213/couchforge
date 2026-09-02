# CouchForge Wiki

In-depth guides, step-by-step setup, troubleshooting, FAQ, and tips.

**Repo:** [github.com/IornMan1213/couchforge](https://github.com/IornMan1213/couchforge)  
**Port:** `3090` (default)

---

## Contents

| Guide | What it is for |
|-------|----------------|
| [1. Getting Started](01-getting-started.md) | First successful session PC to phone |
| [2. Installation](02-installation.md) | Node, FFmpeg, robotjs, git pull |
| [3. Host PC Setup](03-host-setup.md) | Starting the host, screen share, sessions |
| [4. iPhone / Viewer](04-iphone-viewer.md) | Tailscale, Safari, joining a session |
| [5. Controls](05-controls.md) | Touchpad, hold-to-drag, touchscreen, keyboard, scroll |
| [6. Paths and Codecs](06-paths-and-codecs.md) | Auto / Hardware / Compat, H.264 / AV1 / HEVC |
| [7. Networking (Tailscale)](07-networking.md) | IPs, firewall, LAN vs Tailscale |
| [8. Troubleshooting](08-troubleshooting.md) | No video, no click, encoder errors, step-by-step fixes |
| [9. FAQ](09-faq.md) | Common questions |
| [10. Tips and Best Practices](10-tips.md) | Latency, YouTube-from-couch, battery, quality |
| [Architecture](ARCHITECTURE.md) | How the stack is built |

---

## Quick diagnosis

| Symptom | Jump to |
|---------|---------|
| Touch works, black screen | [No video](08-troubleshooting.md#no-video-black-screen) |
| Every touch clicks | [Controls](05-controls.md) |
| FFmpeg / encoder errors | [Encoder fails](08-troubleshooting.md#encoder-fails-or-exits) |
| Cannot open from phone | [Networking](07-networking.md) |
| iPhone Safari issues | [iPhone viewer](04-iphone-viewer.md) |

---

## Related project

[Couch Share](https://github.com/IornMan1213/couch-share) — lighter WebRTC-only tool (port 3080). CouchForge is the hardware-encode / gaming-oriented successor.
