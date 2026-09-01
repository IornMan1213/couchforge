/**
 * Hardware encode manager — spawns FFmpeg with low-latency capture + GPU encode.
 * Detects NVENC / AMF / QSV and falls back to libx264.
 */
const { spawn } = require('child_process');
const which = require('which');

const PRESETS = {
  latency:  { fps: 30, scale: '1280:720',  bitrate: '4M',  gop: 30 },
  balanced: { fps: 60, scale: '1920:1080', bitrate: '10M', gop: 60 },
  quality:  { fps: 60, scale: '1920:1080', bitrate: '20M', gop: 60 }
};

async function findFfmpeg() {
  try {
    return await which('ffmpeg');
  } catch {
    return null;
  }
}

async function detectEncoder(ffmpegPath) {
  return new Promise((resolve) => {
    const p = spawn(ffmpegPath, ['-hide_banner', '-encoders'], { windowsHide: true });
    let out = '';
    p.stdout.on('data', d => out += d.toString());
    p.stderr.on('data', d => out += d.toString());
    p.on('close', () => {
      if (/h264_nvenc/.test(out)) return resolve({ codec: 'h264_nvenc', name: 'NVIDIA NVENC' });
      if (/h264_amf/.test(out)) return resolve({ codec: 'h264_amf', name: 'AMD AMF' });
      if (/h264_qsv/.test(out)) return resolve({ codec: 'h264_qsv', name: 'Intel Quick Sync' });
      resolve({ codec: 'libx264', name: 'Software x264' });
    });
  });
}

function buildArgs(encoder, presetName, display = 0) {
  const preset = PRESETS[presetName] || PRESETS.balanced;
  const args = ['-hide_banner', '-loglevel', 'error', '-fflags', 'nobuffer', '-flags', 'low_delay'];

  args.push(
    '-f', 'lavfi',
    '-i', `ddagrab=output_idx=${display}:framerate=${preset.fps}:draw_mouse=1`
  );

  if (preset.scale) {
    args.push('-vf', `scale=${preset.scale}`);
  }

  args.push('-c:v', encoder.codec);

  if (encoder.codec === 'h264_nvenc') {
    args.push(
      '-preset', 'p1',
      '-tune', 'll',
      '-rc', 'cbr',
      '-b:v', preset.bitrate,
      '-maxrate', preset.bitrate,
      '-bufsize', preset.bitrate,
      '-g', String(preset.gop),
      '-bf', '0',
      '-delay', '0',
      '-zerolatency', '1'
    );
  } else if (encoder.codec === 'h264_amf') {
    args.push(
      '-quality', 'speed',
      '-rc', 'cbr',
      '-b:v', preset.bitrate,
      '-g', String(preset.gop),
      '-bf_delta_qp', '0',
      '-usage', 'ultralowlatency'
    );
  } else if (encoder.codec === 'h264_qsv') {
    args.push(
      '-preset', 'veryfast',
      '-look_ahead', '0',
      '-b:v', preset.bitrate,
      '-g', String(preset.gop),
      '-bf', '0'
    );
  } else {
    args.push(
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', preset.bitrate,
      '-g', String(preset.gop),
      '-bf', '0',
      '-x264-params', 'scenecut=0:keyint=' + preset.gop
    );
  }

  args.push(
    '-pix_fmt', 'yuv420p',
    '-an',
    '-f', 'mpegts',
    'pipe:1'
  );

  return args;
}

function startEncoder({ ffmpegPath, encoder, preset, display, onData, onExit, onError }) {
  const args = buildArgs(encoder, preset, display);
  console.log('[encoder]', ffmpegPath, args.join(' '));

  const proc = spawn(ffmpegPath, args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (chunk) => onData && onData(chunk));
  proc.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log('[ffmpeg]', msg);
  });
  proc.on('exit', (code) => onExit && onExit(code));
  proc.on('error', (err) => onError && onError(err));

  return {
    proc,
    stop() {
      try { proc.kill('SIGTERM'); } catch (_) {}
    }
  };
}

function buildGdiArgs(encoder, presetName) {
  const preset = PRESETS[presetName] || PRESETS.balanced;
  const args = [
    '-hide_banner', '-loglevel', 'error', '-fflags', 'nobuffer', '-flags', 'low_delay',
    '-f', 'gdigrab', '-framerate', String(preset.fps), '-draw_mouse', '1', '-i', 'desktop'
  ];
  if (preset.scale) args.push('-vf', `scale=${preset.scale}`);
  args.push('-c:v', encoder.codec);
  if (encoder.codec === 'h264_nvenc') {
    args.push('-preset', 'p1', '-tune', 'll', '-rc', 'cbr', '-b:v', preset.bitrate, '-g', String(preset.gop), '-bf', '0', '-zerolatency', '1');
  } else if (encoder.codec === 'libx264') {
    args.push('-preset', 'ultrafast', '-tune', 'zerolatency', '-b:v', preset.bitrate, '-g', String(preset.gop), '-bf', '0');
  } else {
    args.push('-b:v', preset.bitrate, '-g', String(preset.gop));
  }
  args.push('-pix_fmt', 'yuv420p', '-an', '-f', 'mpegts', 'pipe:1');
  return args;
}

function startEncoderGdi(opts) {
  const args = buildGdiArgs(opts.encoder, opts.preset);
  console.log('[encoder-gdi]', opts.ffmpegPath, args.join(' '));
  const proc = spawn(opts.ffmpegPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (chunk) => opts.onData && opts.onData(chunk));
  proc.stderr.on('data', (d) => { const m = d.toString().trim(); if (m) console.log('[ffmpeg]', m); });
  proc.on('exit', (code) => opts.onExit && opts.onExit(code));
  proc.on('error', (err) => opts.onError && opts.onError(err));
  return { proc, stop() { try { proc.kill('SIGTERM'); } catch (_) {} } };
}

module.exports = {
  PRESETS,
  findFfmpeg,
  detectEncoder,
  startEncoder,
  startEncoderGdi
};
