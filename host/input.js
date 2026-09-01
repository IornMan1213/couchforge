/**
 * Input injection — mouse, keyboard, gamepad→keys via robotjs when available.
 */
let robot = null;
try {
  robot = require('robotjs');
  console.log('[input] robotjs loaded');
} catch {
  console.log('[input] robotjs not installed — input will be logged only');
}

const gpBtnState = {};
const gpAxisState = {};

const GP_MAP = {
  0: 'space', 1: 'escape', 2: 'e', 3: 'q',
  12: 'up', 13: 'down', 14: 'left', 15: 'right',
  4: 'shift', 5: 'control', 6: 'z', 7: 'c'
};

function inject(event) {
  if (!robot) return;
  try {
    if (event.type === 'mousemove') {
      if (event.mode === 'relative') {
        const pos = robot.getMousePos();
        robot.moveMouse(pos.x + (event.dx || 0), pos.y + (event.dy || 0));
      } else {
        const screen = robot.getScreenSize();
        robot.moveMouse(
          Math.round(event.x * screen.width),
          Math.round(event.y * screen.height)
        );
      }
    } else if (event.type === 'mousedown') {
      robot.mouseToggle('down', event.button === 2 ? 'right' : 'left');
    } else if (event.type === 'mouseup') {
      robot.mouseToggle('up', event.button === 2 ? 'right' : 'left');
    } else if (event.type === 'click') {
      robot.mouseClick(event.button === 2 ? 'right' : 'left');
    } else if (event.type === 'wheel') {
      robot.scrollMouse(0, event.deltaY > 0 ? -1 : 1);
    } else if (event.type === 'keydown') {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
      robot.keyToggle(key, 'down');
    } else if (event.type === 'keyup') {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
      robot.keyToggle(key, 'up');
    } else if (event.type === 'gamepad' && event.buttons) {
      event.buttons.forEach((b, i) => {
        const key = GP_MAP[i];
        if (!key) return;
        const was = !!gpBtnState[i];
        const now = !!b.pressed;
        if (now && !was) robot.keyToggle(key, 'down');
        if (!now && was) robot.keyToggle(key, 'up');
        gpBtnState[i] = now;
      });
      if (event.axes && event.axes.length >= 2) {
        const [ax, ay] = event.axes;
        const dead = 0.35;
        const dirs = {
          left: ax < -dead, right: ax > dead,
          up: ay < -dead, down: ay > dead
        };
        for (const [dir, on] of Object.entries(dirs)) {
          const was = !!gpAxisState[dir];
          if (on && !was) robot.keyToggle(dir, 'down');
          if (!on && was) robot.keyToggle(dir, 'up');
          gpAxisState[dir] = on;
        }
      }
    }
  } catch (err) {
    console.error('[input]', err.message);
  }
}

module.exports = { inject };
