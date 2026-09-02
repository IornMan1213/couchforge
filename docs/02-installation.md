# 2. Installation

## Step 1 — Node.js

1. Download LTS from https://nodejs.org
2. Install with default options
3. Verify:

```bat
node -v
npm -v
```

Need **v18 or newer**.

## Step 2 — Clone the repo

```bat
cd %USERPROFILE%\Downloads
git clone https://github.com/IornMan1213/couchforge.git
cd couchforge
```

Or download the ZIP from GitHub → Extract → open that folder in a terminal.

> Prefer the **git clone** folder (not an old `couchforge-main` ZIP) so `git pull` works for updates.

## Step 3 — npm install

```bat
npm install
```

This installs Express, Socket.IO, etc., and runs **`postinstall` → `scripts/ensure-ffmpeg.js`**.

### What ensure-ffmpeg does

1. Looks for FFmpeg already on PATH
2. Else looks under `tools\ffmpeg\bin\`
3. Else downloads a portable **BtbN** build (Windows/Linux) into `tools\ffmpeg\`

Failures do **not** fail `npm install` (you can still use WebRTC Compat without FFmpeg).

Manual retry:

```bat
npm run ensure-ffmpeg
```

## Step 4 — robotjs (mouse / keyboard)

```bat
npm install robotjs
```

Required for remote mouse/keyboard injection. Needs Windows build tools sometimes:

- If install fails: install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with “Desktop development with C++”, then retry `npm install robotjs`.

Without robotjs, video may still work; **input will not**.

## Step 5 — FFmpeg (optional for Compat, needed for Hardware path)

### Option A — System FFmpeg (recommended if you already have one)

Gyan essentials or full build: https://www.gyan.dev/ffmpeg/builds/

1. Unzip e.g. to `C:\Users\<you>\ffmpeg\`
2. Add `C:\Users\<you>\ffmpeg\bin` to **PATH**
3. New terminal:

```bat
ffmpeg -version
```

### Option B — Bundled by CouchForge

After `npm install` / `npm run ensure-ffmpeg`, binary lives at:

`couchforge\tools\ffmpeg\bin\ffmpeg.exe`

### Verify NVENC (NVIDIA)

```bat
ffmpeg -hide_banner -encoders | findstr nvenc
```

You want to see `h264_nvenc` (and optionally `av1_nvenc`).

### Quick capture test

```bat
ffmpeg -f gdigrab -framerate 30 -i desktop -t 3 -c:v h264_nvenc -preset p4 -b:v 5M -y %TEMP%\test.mp4
```

If this fails, Hardware path will fail; use **Compat (WebRTC)** until FFmpeg/GPU is fixed.

## Step 6 — Updates

```bat
cd %USERPROFILE%\Downloads\couchforge
git pull
npm install
npm start
```

Always **hard-refresh** the phone browser after updates (or close the tab) so `client.js` reloads.

## Uninstall / clean

Delete the `couchforge` folder. Optional: remove `tools\ffmpeg` (large). No system services are installed.
