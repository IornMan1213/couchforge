# 10. Tips and Best Practices

## Couch YouTube workflow

1. PC: headset selected as default playback device
2. Open YouTube (or any player) **on the PC**
3. Phone: CouchForge viewer — control playback, scrub, skip
4. Audio stays in the headset; video on the phone is for UI/control

## Prefer these settings for iPhone

- Path: **Compat** or **Auto**
- Codec: **Auto** / **H.264** (mostly affects HW path)
- Control: **Touchpad (tap to click)**
- Quality: **Balanced** or **Low latency**

## Reduce frustration

- Keep the host **terminal** and **Chrome host tab** open
- Approve **Entire screen** once per session
- After every `git pull`, restart host + refresh phone
- Use Tailscale IP (`100.x`) from the phone

## Performance

- Close unused browser tabs on the PC
- On NVIDIA, latest Game Ready/Studio drivers help NVENC
- Wired Ethernet on the PC + solid Wi-Fi on the phone beats two weak radios
- If control feels laggy but video is fine, try **Low latency** preset

## Input tips

- Raise **Speed** on 1440p/4K desktops
- Use **hold to drag** only when needed, then switch back to tap-to-click
- Long-press right-click is easier with a steady finger (no micro-movements)
- Two-finger scroll for long pages

## Development / hacking

- Client: `public/client.js`
- Host: `host/index.js`, `host/encoder.js`, `host/input.js`
- FFmpeg helper: `scripts/ensure-ffmpeg.js`
- Docs: `docs/` (this wiki)

## When to use Couch Share instead

If you only need “phone controls PC in the browser” and want the smallest moving parts, [Couch Share](https://github.com/IornMan1213/couch-share) on port **3080** is still a solid WebRTC-only tool. Use CouchForge when you care about HW encode experiments and the newer control modes.
