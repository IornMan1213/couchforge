/**
 * CouchForge host — hardware encode path + signaling + input.
 * Windows 10/11 + FFmpeg recommended.
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const {
  findFfmpeg, detectEncoder, startEncoder, startEncoderGdi, PRESETS
} = require('./encoder');
const { inject } = require('./input');

const PORT = process.env.PORT || 3090;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, maxHttpBufferSize: 1e7 });

app.use(express.static(path.join(__dirname, '..', 'public')));

const sessions = new Map();
let ffmpegPath = null;
let encoderInfo = null;

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

function startSessionEncoder(session, preset) {
  stopSessionEncoder(session);
  if (!ffmpegPath || !encoderInfo) {
    console.log('[host] FFmpeg/encoder not ready — use compat (WebRTC) mode on client');
    return;
  }

  const common = {
    ffmpegPath,
    encoder: encoderInfo,
    preset: preset || 'balanced',
    display: 0,
    onData: (chunk) => broadcastTs(session, chunk),
    onExit: (code) => {
      console.log('[encoder] exited', code);
      if (!session._triedGdi) {
        session._triedGdi = true;
        console.log('[encoder] retrying with gdigrab…');
        session.encoder = startEncoderGdi({
          ...common,
          onExit: (c) => console.log('[encoder-gdi] exited', c)
        });
      }
    },
    onError: (err) => console.error('[encoder]', err.message)
  };

  session.encoder = startEncoder(common);
  session.preset = preset;
}

io.on('connection', (socket) => {
  console.log('client', socket.id);

  socket.on('create-session', (opts = {}) => {
    const code = generateCode();
    const preset = opts.preset || 'balanced';
    const session = {
      hostSocket: socket,
      viewers: new Set(),
      encoder: null,
      preset,
      _triedGdi: false
    };
    sessions.set(code, session);
    socket.join(code);
    socket.sessionCode = code;
    socket.role = 'host';
    socket.emit('session-created', {
      code,
      encoder: encoderInfo,
      ffmpeg: !!ffmpegPath,
      presets: Object.keys(PRESETS)
    });
    console.log('session', code, 'encoder', encoderInfo?.name || 'none');
  });

  socket.on('start-encode', (opts = {}) => {
    const session = sessions.get(socket.sessionCode);
    if (!session || socket.role !== 'host') return;
    startSessionEncoder(session, opts.preset || session.preset || 'balanced');
    socket.emit('encode-started', { preset: session.preset, encoder: encoderInfo });
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
      encoder: encoderInfo,
      preset: session.preset,
      hwReady: !!(ffmpegPath && encoderInfo)
    });
    session.hostSocket.emit('viewer-joined', { viewerId: socket.id });
    if (!session.encoder && ffmpegPath) {
      startSessionEncoder(session, session.preset);
    }
  });

  socket.on('signal', (data) => {
    const { target, signal } = data;
    if (target) io.to(target).emit('signal', { from: socket.id, signal });
    else if (socket.sessionCode) socket.to(socket.sessionCode).emit('signal', { from: socket.id, signal });
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
  if (ffmpegPath) {
    encoderInfo = await detectEncoder(ffmpegPath);
    console.log('[host] FFmpeg:', ffmpegPath);
    console.log('[host] Encoder:', encoderInfo.name, `(${encoderInfo.codec})`);
  } else {
    console.log('[host] FFmpeg not found in PATH — hardware path disabled, use WebRTC compat mode');
  }

  server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIPs();
    console.log('\n========================================');
    console.log('  CouchForge host running');
    console.log('========================================');
    console.log(`Local:   http://localhost:${PORT}`);
    ips.forEach(ip => console.log(`Network: http://${ip}:${PORT}`));
    console.log('\nOpen the URL on this PC, start a session,');
    console.log('then join from your phone over Tailscale.');
    console.log('========================================\n');
  });
}

main();
