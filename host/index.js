/**
 * CouchForge host — hardware encode path + signaling + input.
 * Windows 10/11 + FFmpeg recommended. Supports AV1 / HEVC / H.264.
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const {
  findFfmpeg,
  detectEncoders,
  pickEncoder,
  startEncoder,
  startEncoderGdi,
  PRESETS,
  CODEC_LABELS
} = require('./encoder');
const { inject } = require('./input');

const PORT = process.env.PORT || 3090;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, maxHttpBufferSize: 1e7 });

app.use(express.static(path.join(__dirname, '..', 'public')));

const sessions = new Map();
let ffmpegPath = null;
let availableCodecs = [];
let defaultEncoder = null;

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getLocalIPs() {
  const ips = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

function broadcastTs(session, chunk) {
  for (const viewer of session.viewers) {
    viewer.emit('ts', chunk);
  }
}

function stopSessionEncoder(session) {
  if (session.encoder) {
    session.encoder.stop();
    session.encoder = null;
  }
}

function resolveEncoder(codecPref) {
  return pickEncoder(availableCodecs, codecPref || 'auto');
}

function startSessionEncoder(session, preset, codecPref) {
  stopSessionEncoder(session);
  if (!ffmpegPath || !availableCodecs.length) {
    console.log('[host] FFmpeg/encoder not ready — use compat (WebRTC) mode on client');
    return;
  }

  const encoder = resolveEncoder(codecPref || session.codecPref || 'auto');
  session.activeEncoder = encoder;
  session.preset = preset || session.preset || 'balanced';
  session.codecPref = codecPref || session.codecPref || 'auto';
  session._triedGdi = false;
  session._triedH264 = false;

  const common = {
    ffmpegPath,
    encoder,
    preset: session.preset,
    display: 0,
    onData: (chunk) => broadcastTs(session, chunk),
    onExit: (code) => {
      console.log('[encoder] exited', code);
      if (!session._triedGdi) {
        session._triedGdi = true;
        console.log('[encoder] retrying with gdigrab…');
        session.encoder = startEncoderGdi({
          ...common,
          encoder: session.activeEncoder,
          onExit: (c) => {
            console.log('[encoder-gdi] exited', c);
            if (!session._triedH264 && session.activeEncoder && /av1|hevc/i.test(session.activeEncoder.codec)) {
              session._triedH264 = true;
              const h264 = pickEncoder(availableCodecs, 'h264');
              console.log('[encoder] retrying gdigrab with', h264.name);
              session.activeEncoder = h264;
              session.encoder = startEncoderGdi({
                ...common,
                encoder: h264,
                onExit: (c2) => console.log('[encoder-gdi-h264] exited', c2)
              });
            }
          }
        });
      }
    },
    onError: (err) => console.error('[encoder]', err.message)
  };

  console.log('[host] starting encode', encoder.name, 'preset', session.preset);
  session.encoder = startEncoder(common);
}

io.on('connection', (socket) => {
  console.log('client', socket.id);

  socket.on('create-session', (opts = {}) => {
    const code = generateCode();
    const preset = opts.preset || 'balanced';
    const codecPref = opts.codec || 'auto';
    const session = {
      hostSocket: socket,
      viewers: new Set(),
      encoder: null,
      activeEncoder: null,
      preset,
      codecPref,
      _triedGdi: false,
      _triedH264: false
    };
    sessions.set(code, session);
    socket.join(code);
    socket.sessionCode = code;
    socket.role = 'host';
    socket.emit('session-created', {
      code,
      encoder: defaultEncoder,
      availableCodecs: availableCodecs.map((id) => ({
        id,
        name: CODEC_LABELS[id] || id
      })),
      ffmpeg: !!ffmpegPath,
      presets: Object.keys(PRESETS)
    });
    console.log('session', code, 'default encoder', defaultEncoder?.name || 'none');
  });

  socket.on('start-encode', (opts = {}) => {
    const session = sessions.get(socket.sessionCode);
    if (!session || socket.role !== 'host') return;
    startSessionEncoder(
      session,
      opts.preset || session.preset || 'balanced',
      opts.codec || session.codecPref || 'auto'
    );
    socket.emit('encode-started', {
      preset: session.preset,
      encoder: session.activeEncoder,
      codecPref: session.codecPref
    });
  });

  socket.on('stop-encode', () => {
    const session = sessions.get(socket.sessionCode);
    if (!session || socket.role !== 'host') return;
    stopSessionEncoder(session);
  });

  socket.on('join-session', (code) => {
    code = (code || '').toUpperCase().trim();
    const session = sessions.get(code);
    if (!session) {
      socket.emit('error', 'Session not found');
      return;
    }
    session.viewers.add(socket);
    socket.join(code);
    socket.sessionCode = code;
    socket.role = 'viewer';
    socket.emit('joined', {
      code,
      encoder: session.activeEncoder || defaultEncoder,
      availableCodecs: availableCodecs.map((id) => ({
        id,
        name: CODEC_LABELS[id] || id
      })),
      preset: session.preset,
      hwReady: !!(ffmpegPath && availableCodecs.length)
    });
    session.hostSocket.emit('viewer-joined', { viewerId: socket.id });
    if (!session.encoder && ffmpegPath) {
      startSessionEncoder(session, session.preset, session.codecPref);
    }
  });

  socket.on('signal', (data) => {
    const { target, signal } = data;
    if (target) io.to(target).emit('signal', { from: socket.id, signal });
    else if (socket.sessionCode) {
      socket.to(socket.sessionCode).emit('signal', { from: socket.id, signal });
    }
  });

  socket.on('input', (event) => {
    if (socket.role !== 'viewer') return;
    inject(event);
  });

  socket.on('ping', () => socket.emit('pong'));

  socket.on('disconnect', () => {
    if (!socket.sessionCode) return;
    const session = sessions.get(socket.sessionCode);
    if (!session) return;
    if (socket.role === 'host') {
      stopSessionEncoder(session);
      socket.to(socket.sessionCode).emit('host-left');
      sessions.delete(socket.sessionCode);
    } else {
      session.viewers.delete(socket);
      if (session.viewers.size === 0) stopSessionEncoder(session);
    }
  });
});

async function main() {
  ffmpegPath = await findFfmpeg();
  if (!ffmpegPath) {
    console.log('[host] FFmpeg not found — trying automatic download…');
    try {
      const { ensure } = require('../scripts/ensure-ffmpeg');
      ffmpegPath = await ensure();
    } catch (err) {
      console.log('[host] Auto-download failed:', err.message);
    }
  }
  if (ffmpegPath) {
    const detected = await detectEncoders(ffmpegPath);
    availableCodecs = detected.available;
    defaultEncoder = detected.best;
    console.log('[host] FFmpeg:', ffmpegPath);
    console.log('[host] Available codecs:', availableCodecs.join(', ') || '(none)');
    console.log('[host] Default encoder:', defaultEncoder.name, `(${defaultEncoder.codec})`);
    if (availableCodecs.some((c) => /av1/i.test(c))) {
      console.log('[host] AV1 hardware/software encode is available');
    }
  } else {
    console.log('[host] FFmpeg not found — hardware path disabled, use WebRTC compat mode');
    console.log('[host] Or run: npm run ensure-ffmpeg');
  }

  server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIPs();
    console.log('\n========================================');
    console.log('  CouchForge host running');
    console.log('========================================');
    console.log(`Local:   http://localhost:${PORT}`);
    ips.forEach((ip) => console.log(`Network: http://${ip}:${PORT}`));
    console.log('\nOpen the URL on this PC, start a session,');
    console.log('then join from your phone over Tailscale.');
    console.log('========================================\n');
  });
}

main();
