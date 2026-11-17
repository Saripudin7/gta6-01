// Keyboard and mouse input. Held keys give a direction; one-shot presses
// (interact, pause, shoot) are consumed once per frame.
export const ACTION = {
  INTERACT: 1,
  SHOOT: 2,
  PAUSE: 4,
  MUTE: 8,
  MISSION: 16,
};

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
    wheel: 0,
  };

  const KEYMAP = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    ShiftLeft: 'sprint',
    ShiftRight: 'sprint',
    Space: 'brake',
    KeyE: 'interact',
    KeyF: 'interact',
    KeyP: 'pause',
    Escape: 'pause',
    KeyM: 'mission',
    KeyN: 'mute',
    KeyR: 'respawn',
    Enter: 'enter',
  };

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (['up', 'down', 'left', 'right', 'brake'].includes(action)) e.preventDefault();
    if (!e.repeat) {
      input.keys.add(action);
      input.pressed.add(action);
    }
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouse.down = true;
      input.mouse.clicked = true;
    }
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  input.consumePressed = function consumePressed() {
    const p = input.pressed;
    input.pressed = new Set();
    return p;
  };
  input.endFrame = function endFrame() {
    input.mouse.clicked = false;
  };
  return input;
}
