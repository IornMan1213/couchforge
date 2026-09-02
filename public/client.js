const socket = io({ reconnection: true, reconnectionAttempts: 20 });
const $ = (id) => document.getElementById(id);

const statusEl = $('status');
const connEl = $('connStatus');
const setup = $('setup');
const stage = $('stage');
const vid = $('vid');
const hostInfo = $('hostInfo');
const codeDisplay = $('codeDisplay');
const encInfo = $('encInfo');
const hud = $('hud');
const vkb = $('vkb');
const statsEl = $('stats');

let peer = null;
let localStream = null;
let tsPlayer = null;
let role = null;
let code = null;
let inputMode = localStorage.getItem('cf-mode') || 'touchpad';
let perfMode = localStorage.getItem('cf-perf') || 'balanced';
let pathMode = localStorage.getItem('cf-path') || 'auto';
let codecMode = localStorage.getItem('cf-codec') || 'auto';
let roomCode = (localStorage.getItem('cf-room') || localStorage.getItem('cf-last-code') || 'COUCH1').toUpperCase();
let rememberRoom = localStorage.getItem('cf-remember') !== '0';
let sens = parseFloat(localStorage.getItem('cf-sens') || '1.5');
let lastTX = 0, lastTY = 0, touching = false, longT = null;
let touchMoved = false, touchStartAt = 0, dragActive = false;
let wakeLock = null, hideT = null, statsOn = false, lastRtt = 0, pingT = 0;
let hwReady = false, activePath = null;

function setStatus(t) { statusEl.textContent = t; }
function setConn(t, c = '#9ca3af') { connEl.textContent = t; connEl.style.color = c; }

$('inputMode').value = inputMode;
$('perfMode').value = perfMode;
$('pathMode').value = pathMode;
if ($('codecMode')) $('codecMode').value = codecMode;
$('sens').value = sens;
$('sensVal').textContent = sens.toFixed(1) + 'x';
if ($('roomCode')) $('roomCode').value = roomCode;
if ($('joinCode')) $('joinCode').value = localStorage.getItem('cf-last-code') || roomCode;
if ($('rememberRoom')) $('rememberRoom').checked = rememberRoom;
if ($('btnQuickJoin') && (localStorage.getItem('cf-last-code') || roomCode)) {
  const q = localStorage.getItem('cf-last-code') || roomCode;
  $('btnQuickJoin').style.display = 'block';
  $('btnQuickJoin').textContent = 'Join ' + q;
}

$('inputMode').onchange = (e) => { inputMode = e.target.value; localStorage.setItem('cf-mode', inputMode); };
$('perfMode').onchange = (e) => { perfMode = e.target.value; localStorage.setItem('cf-perf', perfMode); };
$('pathMode').onchange = (e) => { pathMode = e.target.value; localStorage.setItem('cf-path', pathMode); };
if ($('codecMode')) $('codecMode').onchange = (e) => { codecMode = e.target.value; localStorage.setItem('cf-codec', codecMode); };
if ($('roomCode')) {
  $('roomCode').oninput = (e) => {
    roomCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    e.target.value = roomCode;
    localStorage.setItem('cf-room', roomCode || 'COUCH1');
  };
}
if ($('rememberRoom')) {
  $('rememberRoom').onchange = (e) => {
    rememberRoom = !!e.target.checked;
    localStorage.setItem('cf-remember', rememberRoom ? '1' : '0');
  };
}
$('sens').oninput = (e) => {
  sens = parseFloat(e.target.value);
  $('sensVal').textContent = sens.toFixed(1) + 'x';
  localStorage.setItem('cf-sens', sens);
};

function sendInput(obj) { socket.emit('input', obj); }

$('btnHost').onclick = async () => {
  role = 'host';
  if (pathMode === 'webrtc') {
    try {
      setStatus('Requesting display capture…');
      localStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60 }, cursor: 'always' },
        audio: false
      });
      localStream.getVideoTracks()[0].onended = () => cleanup();
    } catch (e) {
      setStatus('Capture cancelled');
      return;
    }
  }
  if ($('roomCode')) {
    roomCode = ($('roomCode').value || roomCode || 'COUCH1').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (roomCode.length < 4) roomCode = 'COUCH1';
    localStorage.setItem('cf-room', roomCode);
  }
  socket.emit('create-session', { preset: perfMode, codec: codecMode, code: roomCode });
};

socket.on('session-created', (info) => {
  code = info.code;
  roomCode = code;
  localStorage.setItem('cf-room', code);
  localStorage.setItem('cf-last-code', code);
  codeDisplay.textContent = code;
  hostInfo.classList.remove('hidden');
  const enc = info.encoder ? `${info.encoder.name}` : 'no HW encoder detected';
  const av1 = (info.availableCodecs || []).some((x) => /av1/i.test(x.id || x));
  encInfo.textContent = info.ffmpeg
    ? `FFmpeg ready · ${enc}` + (av1 ? ' · AV1 available' : '')
    : 'FFmpeg not found — use Compat path or install FFmpeg';
  setStatus('Room ' + code);
  setConn('Waiting for viewer…', '#fbbf24');
  if (pathMode !== 'webrtc' && info.ffmpeg) {
    socket.emit('start-encode', { preset: perfMode, codec: codecMode });
  }
});

$('btnCopy').onclick = () => {
  if (code) navigator.clipboard?.writeText(code).then(() => setStatus('Copied'));
};

socket.on('viewer-joined', async ({ viewerId }) => {
  setConn('Viewer connected', '#4ade80');
  try {
    if (!localStream) {
      setStatus('Allow screen share (needed for phone / Compat)…');
      localStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 }, cursor: 'always' },
        audio: false
      });
      localStream.getVideoTracks()[0].onended = () => cleanup();
    }
    if (peer) { try { peer.destroy(); } catch (_) {} peer = null; }
    peer = new SimplePeer({
      initiator: true,
      stream: localStream,
      trickle: true,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });
    peer.on('signal', (s) => socket.emit('signal', { target: viewerId, signal: s }));
    peer.on('connect', () => setStatus('WebRTC connected — phone can view'));
    peer.on('error', (e) => setStatus('Peer: ' + e.message));
  } catch (e) {
    setStatus('Screen share cancelled — iPhone will have no video (touch still works)');
  }
});

function doJoin(codeStr) {
  const c = String(codeStr || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length < 4) return setStatus('Enter room code (min 4 chars)');
  role = 'viewer';
  if ($('joinCode')) $('joinCode').value = c;
  if (rememberRoom !== false) {
    localStorage.setItem('cf-last-code', c);
    localStorage.setItem('cf-room', c);
  }
  socket.emit('join-session', c);
  setStatus('Joining ' + c + '…');
}

$('btnJoin').onclick = () => doJoin($('joinCode') ? $('joinCode').value : '');
if ($('btnQuickJoin')) {
  $('btnQuickJoin').onclick = () => {
    doJoin(localStorage.getItem('cf-last-code') || localStorage.getItem('cf-room') || roomCode || 'COUCH1');
  };
}
if ($('joinCode')) {
  $('joinCode').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doJoin($('joinCode').value);
  });
}

socket.on('joined', (info) => {
  code = info.code;
  hwReady = !!info.hwReady;
  if (rememberRoom !== false) {
    localStorage.setItem('cf-last-code', code);
    localStorage.setItem('cf-room', code);
    roomCode = code;
  }
  setStatus('Joined ' + code);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const wantHw = !isIOS && pathMode === 'hw' && hwReady;
  if (wantHw) { activePath = 'hw'; startTsPlayer(); }
  else {
    activePath = 'webrtc';
    if (isIOS) setStatus('Joined ' + code + ' (WebRTC)');
    startWebrtcViewer();
  }
  setup.classList.add('hidden');
  stage.style.display = 'block';
  enableInput();
  startGamepad();
  requestWakeLock();
  resetHud();
});

socket.on('encode-started', (info) => {
  setStatus('Encoding: ' + (info.encoder?.name || '') + ' / ' + info.preset);
});
socket.on('encode-updated', (info) => {
  setStatus('Encode now: ' + (info.encoder?.name || info.codecPref || '') + ' / ' + (info.preset || ''));
});

function startTsPlayer() {
  setStatus('Hardware stream starting…');
  setConn('HW path (MPEG-TS)', '#4ade80');
  const mediaSource = new MediaSource();
  vid.src = URL.createObjectURL(mediaSource);
  let sb = null;
  let queue = [];
  mediaSource.addEventListener('sourceopen', () => {
    try { sb = mediaSource.addSourceBuffer('video/mp2t; codecs="avc1.64001f"'); }
    catch {
      try { sb = mediaSource.addSourceBuffer('video/mp2t'); }
      catch (e) { setStatus('This browser cannot play live MPEG-TS — use Compat path'); return; }
    }
    sb.mode = 'sequence';
    sb.addEventListener('updateend', () => {
      if (queue.length && !sb.updating) { try { sb.appendBuffer(queue.shift()); } catch (_) {} }
    });
  });
  socket.on('ts', (buf) => {
    const data = buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    if (!sb) return;
    if (sb.updating || queue.length) queue.push(data);
    else { try { sb.appendBuffer(data); } catch (_) { queue.push(data); } }
  });
}

function startWebrtcViewer() {
  setConn('WebRTC compat', '#4ade80');
  peer = new SimplePeer({
    initiator: false,
    trickle: true,
    config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
  });
  peer.on('signal', (s) => socket.emit('signal', { signal: s }));
  peer.on('stream', (stream) => {
    vid.srcObject = stream;
    vid.muted = true;
    setStatus('Streaming (WebRTC)');
  });
  peer.on('connect', () => setStatus('Connected'));
  peer.on('error', (e) => setStatus('Peer: ' + e.message));
}

socket.on('signal', ({ signal }) => { if (peer) peer.signal(signal); });
socket.on('host-left', () => { setStatus('Host left'); cleanup(); });
socket.on('error', (m) => setStatus(m));
socket.on('connect', () => setConn('Server ok', '#4ade80'));
socket.on('disconnect', () => setConn('Reconnecting…', '#fbbf24'));

setInterval(() => {
  if (!socket.connected) return;
  pingT = performance.now();
  socket.emit('ping');
}, 2500);
socket.on('pong', () => { lastRtt = Math.round(performance.now() - pingT); });

function enableInput() {
  const sendAbs = (cx, cy) => {
    const r = vid.getBoundingClientRect();
    const x = (cx - r.left) / r.width;
    const y = (cy - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    sendInput({ type: 'mousemove', mode: 'absolute', x, y });
  };
  const sendRel = (dx, dy) => {
    const s = sens * 1.8;
    sendInput({ type: 'mousemove', mode: 'relative', dx: Math.round(dx * s), dy: Math.round(dy * s) });
  };

  vid.addEventListener('touchstart', (e) => {
    e.preventDefault();
    resetHud();
    if (e.touches.length > 1) return;
    const t = e.touches[0];
    lastTX = t.clientX; lastTY = t.clientY;
    touching = true; touchMoved = false; touchStartAt = Date.now(); dragActive = false;
    if (inputMode === 'touchscreen') {
      sendAbs(t.clientX, t.clientY);
      sendInput({ type: 'mousedown', button: 0 });
      dragActive = true;
    } else if (inputMode === 'touchpad-drag') {
      longT = setTimeout(() => {
        sendInput({ type: 'mousedown', button: 0 });
        dragActive = true; longT = null;
      }, 200);
    } else {
      longT = setTimeout(() => {
        if (!touchMoved) sendInput({ type: 'click', button: 2 });
        longT = null;
      }, 500);
    }
  }, { passive: false });

  vid.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touching || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - lastTX, dy = t.clientY - lastTY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      touchMoved = true;
      if (longT && inputMode !== 'touchpad-drag') { clearTimeout(longT); longT = null; }
    }
    if (inputMode === 'touchscreen') sendAbs(t.clientX, t.clientY);
    else {
      if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) sendRel(dx, dy);
      lastTX = t.clientX; lastTY = t.clientY;
    }
  }, { passive: false });

  vid.addEventListener('touchend', (e) => {
    e.preventDefault();
    const duration = Date.now() - touchStartAt;
    if (longT) { clearTimeout(longT); longT = null; }
    if (inputMode === 'touchscreen') {
      sendInput({ type: 'mouseup', button: 0 }); dragActive = false;
    } else if (inputMode === 'touchpad-drag') {
      if (dragActive) { sendInput({ type: 'mouseup', button: 0 }); dragActive = false; }
      else if (!touchMoved && duration < 250) sendInput({ type: 'click', button: 0 });
    } else {
      if (!touchMoved && duration < 350) sendInput({ type: 'click', button: 0 });
    }
    touching = false; touchMoved = false;
  }, { passive: false });

  vid.addEventListener('touchcancel', () => {
    if (longT) { clearTimeout(longT); longT = null; }
    if (dragActive) { sendInput({ type: 'mouseup', button: 0 }); dragActive = false; }
    touching = false; touchMoved = false;
  }, { passive: false });

  let pinchY = null;
  vid.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) pinchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
  }, { passive: false });
  vid.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinchY != null) {
      e.preventDefault();
      const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const d = pinchY - y;
      if (Math.abs(d) > 4) { sendInput({ type: 'wheel', deltaY: d * 3 }); pinchY = y; }
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT'].includes(document.activeElement.tagName)) return;
    sendInput({ type: 'keydown', key: e.key });
  });
  window.addEventListener('keyup', (e) => {
    if (['INPUT', 'SELECT'].includes(document.activeElement.tagName)) return;
    sendInput({ type: 'keyup', key: e.key });
  });

  vkb.querySelectorAll('.kb-key').forEach((btn) => {
    const key = btn.dataset.key;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); sendInput({ type: 'keydown', key }); }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); sendInput({ type: 'keyup', key }); }, { passive: false });
  });
}

function startGamepad() {
  let last = null;
  function poll() {
    const pads = navigator.getGamepads?.() || [];
    for (const pad of pads) {
      if (!pad) continue;
      const snap = pad.buttons.map((b) => b.pressed).join('') + pad.axes.map((a) => a.toFixed(2)).join(',');
      if (snap !== last) {
        last = snap;
        sendInput({ type: 'gamepad', buttons: pad.buttons.map((b) => ({ pressed: b.pressed, value: b.value })), axes: Array.from(pad.axes) });
      }
      break;
    }
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);
}

async function requestWakeLock() {
  try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
}

const settingsPanel = $('settingsPanel');
function resetHud() {
  hud.classList.remove('dim');
  clearTimeout(hideT);
  hideT = setTimeout(() => {
    if (vkb.classList.contains('on')) return;
    if (settingsPanel && settingsPanel.classList.contains('on')) return;
    hud.classList.add('dim');
  }, 3200);
}
stage.addEventListener('touchstart', resetHud, { passive: true });

$('btnFs').onclick = () => {
  if (stage.requestFullscreen) stage.requestFullscreen();
  else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
};
$('btnKb').onclick = () => { vkb.classList.toggle('on'); resetHud(); };
$('btnStats').onclick = () => {
  statsOn = !statsOn;
  statsEl.style.display = statsOn ? 'block' : 'none';
};

function syncLiveSettingsUI() {
  if ($('liveInputMode')) $('liveInputMode').value = inputMode;
  if ($('liveSens')) {
    $('liveSens').value = sens;
    if ($('liveSensVal')) $('liveSensVal').textContent = sens.toFixed(1) + 'x';
  }
  if ($('livePerf')) $('livePerf').value = perfMode;
  if ($('liveCodec')) $('liveCodec').value = codecMode;
}
if ($('btnSettings')) {
  $('btnSettings').onclick = () => {
    syncLiveSettingsUI();
    if (settingsPanel) settingsPanel.classList.toggle('on');
    resetHud();
  };
}
if ($('btnCloseSettings')) {
  $('btnCloseSettings').onclick = () => { if (settingsPanel) settingsPanel.classList.remove('on'); };
}
if ($('liveInputMode')) {
  $('liveInputMode').onchange = (e) => {
    inputMode = e.target.value;
    localStorage.setItem('cf-mode', inputMode);
    if ($('inputMode')) $('inputMode').value = inputMode;
    setStatus('Control: ' + inputMode);
  };
}
if ($('liveSens')) {
  $('liveSens').oninput = (e) => {
    sens = parseFloat(e.target.value);
    if ($('liveSensVal')) $('liveSensVal').textContent = sens.toFixed(1) + 'x';
    if ($('sens')) $('sens').value = sens;
    if ($('sensVal')) $('sensVal').textContent = sens.toFixed(1) + 'x';
    localStorage.setItem('cf-sens', sens);
  };
}
if ($('btnApplyEncode')) {
  $('btnApplyEncode').onclick = () => {
    if ($('livePerf')) {
      perfMode = $('livePerf').value;
      localStorage.setItem('cf-perf', perfMode);
      if ($('perfMode')) $('perfMode').value = perfMode;
    }
    if ($('liveCodec')) {
      codecMode = $('liveCodec').value;
      localStorage.setItem('cf-codec', codecMode);
      if ($('codecMode')) $('codecMode').value = codecMode;
    }
    socket.emit('update-encode', { preset: perfMode, codec: codecMode });
    setStatus('Requested encode: ' + codecMode + ' / ' + perfMode);
    if (settingsPanel) settingsPanel.classList.remove('on');
  };
}

$('btnExit').onclick = () => cleanup(true);

setInterval(() => {
  if (!statsOn) return;
  statsEl.textContent = `RTT ~${lastRtt}ms · ${activePath || '-'} · ${perfMode} · ${codecMode} · ${inputMode}`;
}, 800);

function cleanup(reload) {
  if (peer) peer.destroy();
  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  if (wakeLock) wakeLock.release().catch(() => {});
  if (tsPlayer) try { tsPlayer.destroy(); } catch (_) {}
  peer = null; localStream = null;
  if (reload) location.reload();
  else { stage.style.display = 'none'; setup.classList.remove('hidden'); }
}
