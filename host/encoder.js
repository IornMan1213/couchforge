/**
 * Hardware encode manager — FFmpeg capture + GPU encode.
 * Windows: prefer gdigrab (reliable), then ddagrab with hwdownload.
 * NVENC flags kept conservative for older FFmpeg builds.
 */
const { spawn } = require('child_process');
const which = require('which');
const path = require('path');
const fs = require('fs');

const PRESETS = {
  latency:  { fps: 30, scale: '1280:720',  bitrate: '4M',  bitrateAv1: '2.5M', gop: 30 },
  balanced: { fps: 30, scale: '1920:1080', bitrate: '8M',  bitrateAv1: '5M',   gop: 60 },
  quality:  { fps: 60, scale: '1920:1080', bitrate: '15M', bitrateAv1: '10M',  gop: 60 }
};

const CODEC_PREFERENCE = [
  'h264_nvenc', 'h264_amf', 'h264_qsv',
  'hevc_nvenc', 'hevc_amf', 'hevc_qsv',
  'av1_nvenc', 'av1_amf', 'av1_qsv',
  'libx264', 'libsvtav1', 'libaom-av1'
];

const CODEC_LABELS = {
  av1_nvenc: 'NVIDIA AV1 (NVENC)',
  av1_amf: 'AMD AV1 (AMF)',
  av1_qsv: 'Intel AV1 (Quick Sync)',
  hevc_nvenc: 'NVIDIA HEVC (NVENC)',
  hevc_amf: 'AMD HEVC (AMF)',
  hevc_qsv: 'Intel HEVC (Quick Sync)',
  h264_nvenc: 'NVIDIA H.264 (NVENC)',
  h264_amf: 'AMD H.264 (AMF)',
  h264_qsv: 'Intel H.264 (Quick Sync)',
  libsvtav1: 'Software AV1 (SVT)',
  'libaom-av1': 'Software AV1 (libaom)',
  libx264: 'Software H.264 (x264)'
};

function localBundledFfmpeg() {
  const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const roots = [
    path.join(__dirname, '..', 'tools', 'ffmpeg', 'bin', binName),
    path.join(__dirname, '..', 'tools', 'ffmpeg', binName)
  ];
  const toolsDir = path.join(__dirname, '..', 'tools', 'ffmpeg');
  try {
    if (fs.existsSync(toolsDir)) {
      for (const name of fs.readdirSync(toolsDir)) {
        roots.push(path.join(toolsDir, name, 'bin', binName));
      }
    }
  } catch (_) {}
  for (const p of roots) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

async function findFfmpeg() {
  const bundled = localBundledFfmpeg();
  if (bundled) return bundled;
  try {
    return await which('ffmpeg');
  } catch {
    return null;
  }
}

async function detectEncoders(ffmpegPath) {
  return new Promise((resolve) => {
    const p = spawn(ffmpegPath, ['-hide_banner', '-encoders'], { windowsHide: true });
    let out = '';
    p.stdout.on('data', (d) => { out += d.toString(); });
    p.stderr.on('data', (d) => { out += d.toString(); });
    p.on('close', () => {
      const available = [];
      for (const id of Object.keys(CODEC_LABELS)) {
        const re = new RegExp('\\b' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (re.test(out)) available.push(id);
      }
      let best = null;
      for (const id of CODEC_PREFERENCE) {
        if (available.includes(id)) {
          best = { codec: id, name: CODEC_LABELS[id] };
          break;
        }
      }
      if (!best) best = { codec: 'libx264', name: CODEC_LABELS.libx264 };
      resolve({ available, best });
    });
  });
}

async function detectEncoder(ffmpegPath) {
  const { best } = await detectEncoders(ffmpegPath);
  return best;
}

function pickEncoder(available, preference) {
  if (!preference || preference === 'auto') {
    for (const id of CODEC_PREFERENCE) {
      if (available.includes(id)) return { codec: id, name: CODEC_LABELS[id] || id };
    }
    return { codec: 'libx264', name: CODEC_LABELS.libx264 };
  }
  if (preference === 'av1') {
    for (const id of ['av1_nvenc', 'av1_amf', 'av1_qsv', 'libsvtav1', 'libaom-av1']) {
      if (available.includes(id)) return { codec: id, name: CODEC_LABELS[id] };
    }
  }
  if (preference === 'hevc' || preference === 'h265') {
    for (const id of ['hevc_nvenc', 'hevc_amf', 'hevc_qsv']) {
      if (available.includes(id)) return { codec: id, name: CODEC_LABELS[id] };
    }
  }
  if (preference === 'h264') {
    for (const id of ['h264_nvenc', 'h264_amf', 'h264_qsv', 'libx264']) {
      if (available.includes(id)) return { codec: id, name: CODEC_LABELS[id] };
    }
  }
  if (available.includes(preference)) {
    return { codec: preference, name: CODEC_LABELS[preference] || preference };
  }
  for (const id of CODEC_PREFERENCE) {
    if (available.includes(id)) return { codec: id, name: CODEC_LABELS[id] };
  }
  return { codec: 'libx264', name: CODEC_LABELS.libx264 };
}

function isAv1(codec) {
  return /av1/i.test(codec);
}

function bitrateFor(encoder, preset) {
  if (isAv1(encoder.codec)) return preset.bitrateAv1 || preset.bitrate;
  return preset.bitrate;
}

function buildEncodeFlags(encoder, preset) {
  const br = bitrateFor(encoder, preset);
  const gop = String(preset.gop);
  const codec = encoder.codec;
  const args = [];

  if (codec === 'h264_nvenc' || codec === 'hevc_nvenc' || codec === 'av1_nvenc') {
    args.push(
      '-preset', 'p4',
      '-rc', 'cbr',
      '-b:v', br,
      '-maxrate', br,
      '-bufsize', br,
      '-g', gop,
      '-bf', '0',
      '-pix_fmt', 'yuv420p'
    );
  } else if (codec === 'h264_amf' || codec === 'hevc_amf' || codec === 'av1_amf') {
    args.push('-quality', 'speed', '-rc', 'cbr', '-b:v', br, '-g', gop, '-pix_fmt', 'yuv420p');
  } else if (codec === 'h264_qsv' || codec === 'hevc_qsv' || codec === 'av1_qsv') {
    args.push('-preset', 'veryfast', '-look_ahead', '0', '-b:v', br, '-g', gop, '-bf', '0', '-pix_fmt', 'yuv420p');
  } else if (codec === 'libsvtav1') {
    args.push('-b:v', br, '-g', gop, '-pix_fmt', 'yuv420p', '-svtav1-params', 'pred-struct=1:preset=10:film-grain=0');
  } else if (codec === 'libaom-av1') {
    args.push('-b:v', br, '-g', gop, '-pix_fmt', 'yuv420p', '-cpu-used', '8', '-row-mt', '1', '-usage', 'realtime');
  } else {
    args.push(
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', br,
      '-g', gop,
      '-bf', '0',
      '-pix_fmt', 'yuv420p',
      '-x264-params', 'scenecut=0:keyint=' + preset.gop
    );
  }
  return args;
}

function buildGdiArgs(encoder, presetName) {
  const preset = PRESETS[presetName] || PRESETS.balanced;
  const args = [
    '-hide_banner', '-loglevel', 'warning',
    '-fflags', 'nobuffer', '-flags', 'low_delay',
    '-f', 'gdigrab', '-framerate', String(preset.fps), '-draw_mouse', '1', '-i', 'desktop'
  ];
  if (preset.scale) args.push('-vf', `scale=${preset.scale}:flags=fast_bilinear`);
  args.push('-c:v', encoder.codec);
  args.push(...buildEncodeFlags(encoder, preset));
  args.push('-an', '-f', 'mpegts', 'pipe:1');
  return args;
}

function buildDdaArgs(encoder, presetName, display = 0) {
  const preset = PRESETS[presetName] || PRESETS.balanced;
  const args = [
    '-hide_banner', '-loglevel', 'warning',
    '-fflags', 'nobuffer', '-flags', 'low_delay',
    '-f', 'lavfi',
    '-i', `ddagrab=output_idx=${display}:framerate=${preset.fps}:draw_mouse=1`
  ];
  if (preset.scale) {
    args.push('-vf', `hwdownload,format=bgra,scale=${preset.scale}:flags=fast_bilinear,format=yuv420p`);
  } else {
    args.push('-vf', 'hwdownload,format=bgra,format=yuv420p');
  }
  args.push('-c:v', encoder.codec);
  args.push(...buildEncodeFlags(encoder, preset));
  args.push('-an', '-f', 'mpegts', 'pipe:1');
  return args;
}

function spawnFfmpeg(ffmpegPath, args, { onData, onExit, onError, label }) {
  console.log('[encoder]', label, args.join(' '));
  const proc = spawn(ffmpegPath, args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let bytes = 0;
  let firstData = false;
  proc.stdout.on('data', (chunk) => {
    bytes += chunk.length;
    if (!firstData) {
      firstData = true;
      console.log('[encoder]', label, 'producing data…');
    }
    onData && onData(chunk);
  });
  proc.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log('[ffmpeg]', msg);
  });
  proc.on('exit', (code, signal) => {
    console.log('[encoder]', label, 'exited code=', code, 'signal=', signal, 'bytes=', bytes);
    onExit && onExit(code, signal, bytes);
  });
  proc.on('error', (err) => {
    console.error('[encoder]', label, err.message);
    onError && onError(err);
  });

  return {
    proc,
    stop() {
      try {
        if (process.platform === 'win32') proc.kill();
        else proc.kill('SIGTERM');
      } catch (_) {}
    }
  };
}

function startEncoder({ ffmpegPath, encoder, preset, display, onData, onExit, onError }) {
  const attempts = [];
  attempts.push({ label: 'gdigrab/' + (encoder.codec || 'enc'), args: buildGdiArgs(encoder, preset) });
  attempts.push({ label: 'ddagrab/' + (encoder.codec || 'enc'), args: buildDdaArgs(encoder, preset, display || 0) });
  if (encoder.codec !== 'libx264') {
    attempts.push({
      label: 'gdigrab/libx264',
      args: buildGdiArgs({ codec: 'libx264', name: 'Software H.264 (x264)' }, preset)
    });
  }

  let current = null;
  let attemptIndex = 0;
  let stopped = false;

  function runNext(reason) {
    if (stopped) return;
    if (attemptIndex >= attempts.length) {
      console.log('[encoder] all capture methods failed');
      onExit && onExit(1, null, 0);
      return;
    }
    const a = attempts[attemptIndex++];
    if (reason) console.log('[encoder] trying next method after:', reason);
    current = spawnFfmpeg(ffmpegPath, a.args, {
      onData,
      onError,
      label: a.label,
      onExit: (code, signal, bytes) => {
        if (stopped) return;
        if (bytes > 0 && (code === 0 || code === null)) {
          onExit && onExit(code, signal, bytes);
          return;
        }
        if (bytes === 0) runNext(a.label + ' produced 0 bytes');
        else onExit && onExit(code, signal, bytes);
      }
    });
  }

  runNext(null);

  return {
    stop() {
      stopped = true;
      if (current) current.stop();
    }
  };
}

function startEncoderGdi(opts) {
  return startEncoder(opts);
}

module.exports = {
  PRESETS, CODEC_LABELS, CODEC_PREFERENCE,
  findFfmpeg, detectEncoder, detectEncoders, pickEncoder,
  isAv1, startEncoder, startEncoderGdi
};
