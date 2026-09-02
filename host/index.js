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

  console.log('[host] starting encode', encoder.name, 'preset', session.preset);
  session.encoder = startEncoder({
    ffmpegPath,
    encoder,
    preset: session.preset,
    display: 0,
    onData: (chunk) => broadcastTs(session, chunk),
    onExit: (code, signal, bytes) => {
      console.log('[host] encode ended code=', code, 'bytes=', bytes || 0);
    },
    onError: (err) => console.error('[encoder]', err.message)
  });
}

io.on('connection', (socket) => {
  console.log('client', socket.id);

  socket.on('create-session', (opts = {}) => {
    // Fixed room code from client — no random password-like code every time
    let code = String(opts.code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 12);
    if (code.length < 4) code = generateCode();

    if (sessions.has(code)) {
      const oldSess = sessions.get(code);
      stopSessionEncoder(oldSess);
      try {
        if (oldSess.hostSocket && oldSess.hostSocket.id !== socket.id) {
          oldSess.hostSocket.emit('error', 'Room taken by a new host');
        }
      } catch (_) {}
      sessions.delete(code);
      console.log('[host] replaced existing room', code);
    }

    const preset = opts.preset || 'balanced';
    const codecPref = opts.codec || 'auto';
    const session = {
      hostSocket: socket,
      viewers: new Set(),
      encoder: null,
      activeEncoder: null,
      preset,
      codecPref
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

  socket.on('update-encode', (opts = {}) => {
    const session = sessions.get(socket.sessionCode);
    if (!session) return;
    const preset = opts.preset || session.preset || 'balanced';
    const codec = opts.codec || session.codecPref || 'auto';
    console.log('[host] live update-encode', codec, preset, 'from', socket.role);
    startSessionEncoder(session, preset, codec);
    const payload = {
      preset: session.preset,
      encoder: session.activeEncoder,
      codecPref: session.codecPref
    };
    io.to(socket.sessionCode).emit('encode-updated', payload);
    if (session.hostSocket) session.hostSocket.emit('encode-started', payload);
  });

  socket.on('stop-encode', () => {
    const session = sessions.get(socket.sessionCode);
    if (!session || socket.role !== 'host') return;
    stopSessionEncoder(session);
  });

  socket.on('join-session', (code) => {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
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
