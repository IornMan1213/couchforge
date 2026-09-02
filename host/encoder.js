/**
 * Hardware encode manager — FFmpeg capture + GPU encode.
 * Supports AV1 (nvenc/amf/qsv), H.264, HEVC; falls back to software.
 */
const { spawn } = require('child_process');
const which = require('which');

const PRESETS = {
  latency:  { fps: 30, scale: '1280:720',  bitrate: '4M',  bitrateAv1: '2.5M', gop: 30 },
  balanced: { fps: 60, scale: '1920:1080', bitrate: '10M', bitrateAv1: '6M',   gop: 60 },
  quality:  { fps: 60, scale: '1920:1080', bitrate: '20M', bitrateAv1: '12M',  gop: 60 }
};

/** Ordered preference when user picks "auto" */
const CODEC_PREFERENCE = [
  'av1_nvenc', 'av1_amf', 'av1_qsv',
  'hevc_nvenc', 'hevc_amf', 'hevc_qsv',
  'h264_nvenc', 'h264_amf', 'h264_qsv',
  'libsvtav1', 'libaom-av1',
  'libx264'
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

async function findFfmpeg() {
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

function isHevc(codec) {
  return /hevc|h265/i.test(codec);
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

  if (codec === 'av1_nvenc') {
    args.push(
      '-preset', 'p1',
      '-tune', 'll',
      '-rc', 'cbr',
      '-b:v', br,
      '-maxrate', br,
      '-bufsize', br,
      '-g', gop,
      '-bf', '0',
      '-delay', '0',
      '-zerolatency', '1'
    );
  } else if (codec === 'av1_amf') {
    args.push(
      '-quality', 'speed',
      '-rc', 'cbr',
      '-b:v', br,
      '-g', gop,
      '-usage', 'ultralowlatency'
    );
  } else if (codec === 'av1_qsv') {
    args.push(
      '-preset', 'veryfast',
      '-look_ahead', '0',
      '-b:v', br,
      '-g', gop,
      '-bf', '0'
    );
  } else if (codec === 'libsvtav1') {
    args.push(
      '-b:v', br,
      '-g', gop,
      '-svtav1-params', 'pred-struct=1:preset=10:film-grain=0'
    );
  } else if (codec === 'libaom-av1') {
    args.push(
      '-b:v', br,
      '-g', gop,
      '-cpu-used', '8',
      '-row-mt', '1',
      '-tiles', '2x2',
      '-usage', 'realtime'
    );
  } else if (codec === 'hevc_nvenc' || codec === 'h264_nvenc') {
    args.push(
      '-preset', 'p1',
      '-tune', 'll',
      '-rc', 'cbr',
      '-b:v', br,
      '-maxrate', br,
      '-bufsize', br,
      '-g', gop,
      '-bf', '0',
      '-delay', '0',
      '-zerolatency', '1'
    );
  } else if (codec === 'hevc_amf' || codec === 'h264_amf') {
    args.push(
      '-quality', 'speed',
      '-rc', 'cbr',
      '-b:v', br,
      '-g', gop,
      '-usage', 'ultralowlatency'
    );
  } else if (codec === 'hevc_qsv' || codec === 'h264_qsv') {
    args.push(
      '-preset', 'veryfast',
      '-look_ahead', '0',
      '-b:v', br,
      '-g', gop,
      '-bf', '0'
    );
  } else {
    args.push(
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', br,
      '-g', gop,
      '-bf', '0',
      '-x264-params', 'scenecut=0:keyint=' + preset.gop
    );
  }
  return args;
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
  args.push(...buildEncodeFlags(encoder, preset));

  args.push(
    '-pix_fmt', 'yuv420p',
    '-an',
    '-f', 'mpegts',
    'pipe:1'
  );

  return args;
}

function buildGdiArgs(encoder, presetName) {
  const preset = PRESETS[presetName] || PRESETS.balanced;
  const args = [
    '-hide_banner', '-loglevel', 'error', '-fflags', 'nobuffer', '-flags', 'low_delay',
    '-f', 'gdigrab', '-framerate', String(preset.fps), '-draw_mouse', '1', '-i', 'desktop'
  ];
  if (preset.scale) args.push('-vf', `scale=${preset.scale}`);
  args.push('-c:v', encoder.codec);
  args.push(...buildEncodeFlags(encoder, preset));
  args.push('-pix_fmt', 'yuv420p', '-an', '-f', 'mpegts', 'pipe:1');
  return args;
}

function startEncoder({ ffmpegPath, encoder, preset, display, onData, onExit, onError }) {
  const args = buildArgs(encoder, preset, display);
  console.log('[encoder]', encoder.name || encoder.codec, args.join(' '));

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

function startEncoderGdi(opts) {
  const args = buildGdiArgs(opts.encoder, opts.preset);
  console.log('[encoder-gdi]', opts.encoder.name || opts.encoder.codec, args.join(' '));
  const proc = spawn(opts.ffmpegPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (chunk) => opts.onData && opts.onData(chunk));
  proc.stderr.on('data', (d) => {
    const m = d.toString().trim();
    if (m) console.log('[ffmpeg]', m);
  });
  proc.on('exit', (code) => opts.onExit && opts.onExit(code));
  proc.on('error', (err) => opts.onError && opts.onError(err));
  return {
    proc,
    stop() {
      try { proc.kill('SIGTERM'); } catch (_) {}
    }
  };
}

module.exports = {
  PRESETS,
  CODEC_LABELS,
  CODEC_PREFERENCE,
  findFfmpeg,
  detectEncoder,
  detectEncoders,
  pickEncoder,
  isAv1,
  isHevc,
  startEncoder,
  startEncoderGdi
};
