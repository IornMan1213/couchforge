/**
 * Download a portable FFmpeg build into tools/ffmpeg if not already present.
 * Windows/Linux: BtbN gpl builds (NVENC/AMF/QSV when drivers support them).
 * Failures exit 0 so npm install still succeeds.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawnSync } = require('child_process');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools', 'ffmpeg');
const MARKER = path.join(TOOLS, '.couchforge-ffmpeg');

const URLS = {
  win32: {
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    kind: 'zip',
    binary: 'ffmpeg.exe'
  },
  linux: {
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    kind: 'tar.xz',
    binary: 'ffmpeg'
  }
};

function log(...args) {
  console.log('[ensure-ffmpeg]', ...args);
}

function existsExe(file) {
  try {
    fs.accessSync(file, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function findLocalBinary() {
  const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const candidates = [
    path.join(TOOLS, 'bin', binName),
    path.join(TOOLS, binName)
  ];
  if (fs.existsSync(TOOLS)) {
    try {
      for (const name of fs.readdirSync(TOOLS)) {
        const p = path.join(TOOLS, name, 'bin', binName);
        if (existsExe(p)) candidates.push(p);
      }
    } catch (_) {}
  }
  for (const c of candidates) {
    if (existsExe(c)) return c;
  }
  return null;
}

function whichSystem() {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(cmd, ['ffmpeg'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout) {
    const line = r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    if (line && existsExe(line)) return line;
  }
  return null;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    log('Downloading', url);
    log('Saving to', dest);
    const file = fs.createWriteStream(dest);
    const get = (u, redirects = 0) => {
      if (redirects > 8) return reject(new Error('Too many redirects'));
      const lib = u.startsWith('https') ? https : http;
      lib
        .get(u, { headers: { 'User-Agent': 'CouchForge-ensure-ffmpeg' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return get(res.headers.location, redirects + 1);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error('HTTP ' + res.statusCode));
          }
          const total = parseInt(res.headers['content-length'] || '0', 10);
          let got = 0;
          let lastPct = -1;
          res.on('data', (chunk) => {
            got += chunk.length;
            if (total > 0) {
              const pct = Math.floor((got / total) * 100);
              if (pct >= lastPct + 10) {
                lastPct = pct;
                log(`Progress ${pct}%`);
              }
            }
          });
          res.pipe(file);
          file.on('finish', () => file.close(() => resolve(dest)));
        })
        .on('error', (err) => {
          try { fs.unlinkSync(dest); } catch (_) {}
          reject(err);
        });
    };
    get(url);
  });
}

function extractZip(zipPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  if (process.platform === 'win32') {
    const ps = `Expand-Archive -Path "${zipPath.replace(/'/g, "''")}" -DestinationPath "${outDir.replace(/'/g, "''")}" -Force`;
    const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr || r.stdout || 'Expand-Archive failed');
    return;
  }
  const r = spawnSync('unzip', ['-o', zipPath, '-d', outDir], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(r.stderr || 'unzip failed — install unzip or extract manually');
  }
}

function extractTarXz(archivePath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync('tar', ['-xJf', archivePath, '-C', outDir], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(r.stderr || 'tar extract failed');
  }
}

function flattenToTools(extractRoot) {
  const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  function walk(dir, depth = 0) {
    if (depth > 6) return null;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile() && e.name === binName) return full;
      if (e.isDirectory()) {
        const found = walk(full, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  const found = walk(extractRoot);
  if (!found) throw new Error('ffmpeg binary not found after extract');

  const binDir = path.join(TOOLS, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  const foundDir = path.dirname(found);
  if (path.basename(foundDir) === 'bin') {
    for (const name of fs.readdirSync(foundDir)) {
      const src = path.join(foundDir, name);
      const dest = path.join(binDir, name);
      fs.copyFileSync(src, dest);
      if (process.platform !== 'win32') {
        try { fs.chmodSync(dest, 0o755); } catch (_) {}
      }
    }
  } else {
    const dest = path.join(binDir, binName);
    fs.copyFileSync(found, dest);
    if (process.platform !== 'win32') {
      try { fs.chmodSync(dest, 0o755); } catch (_) {}
    }
  }
  return path.join(binDir, binName);
}

async function ensure() {
  const local = findLocalBinary();
  if (local) {
    log('Using existing local FFmpeg:', local);
    return local;
  }

  const system = whichSystem();
  if (system) {
    log('Using system FFmpeg on PATH:', system);
    return system;
  }

  const cfg = URLS[process.platform];
  if (!cfg) {
    log('No automatic FFmpeg package for this OS. Install FFmpeg and add it to PATH.');
    if (process.platform === 'darwin') log('macOS: brew install ffmpeg');
    return null;
  }

  fs.mkdirSync(TOOLS, { recursive: true });
  const tmpDir = path.join(os.tmpdir(), 'couchforge-ffmpeg-' + process.pid);
  fs.mkdirSync(tmpDir, { recursive: true });
  const archiveName = path.basename(cfg.url);
  const archivePath = path.join(tmpDir, archiveName);

  try {
    await download(cfg.url, archivePath);
    log('Extracting…');
    const extractDir = path.join(tmpDir, 'out');
    fs.mkdirSync(extractDir, { recursive: true });
    if (cfg.kind === 'zip') extractZip(archivePath, extractDir);
    else if (cfg.kind === 'tar.xz') extractTarXz(archivePath, extractDir);
    else throw new Error('Unknown archive kind ' + cfg.kind);

    const binary = flattenToTools(extractDir);
    fs.writeFileSync(
      MARKER,
      JSON.stringify({ url: cfg.url, platform: process.platform, installedAt: new Date().toISOString() }, null, 2)
    );
    log('Installed FFmpeg to', binary);
    return binary;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

async function main() {
  try {
    const p = await ensure();
    if (!p) {
      log('FFmpeg not available — CouchForge will use WebRTC compat mode until you install it.');
      process.exitCode = 0;
      return;
    }
    log('Ready:', p);
  } catch (err) {
    log('Failed:', err.message);
    log('You can install FFmpeg manually and re-run: npm run ensure-ffmpeg');
    process.exitCode = 0;
  }
}

if (require.main === module) {
  main();
}

module.exports = { ensure, findLocalBinary, whichSystem };
