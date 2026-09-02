# 5. Controls

Control mode is chosen in the **Control** dropdown (saved per browser).

## Touchpad (tap to click) — default

Best everyday mode.

| Gesture | Action |
|---------|--------|
| Finger slides | Move cursor (**no** click) |
| Short tap (under ~350ms, little movement) | Left click |
| Long press (~500ms, no movement) | Right click |
| Two-finger vertical drag | Mouse wheel scroll |

**Fixed in recent builds:** lifting your finger after moving the cursor no longer always fires a click.

## Touchpad (hold to drag)

Use when you need **click and drag** (scrollbars, dragging files, selecting text).

| Gesture | Action |
|---------|--------|
| Slide quickly | Move cursor |
| Hold ~200ms, then move | Left button held → drag |
| Release | Mouse up |
| Quick short tap | Left click |

## Touchscreen

Finger position maps to screen coordinates (absolute).

| Gesture | Action |
|---------|--------|
| Touch down | Move + left button down |
| Drag | Move with button held |
| Release | Left button up |

Feels more like touching the desktop directly; less ideal for precise desktop pointer work.

## Sensitivity

**Speed** slider multiplies relative movement (touchpad modes). Raise it on a large monitor; lower it for precision.

## Virtual keyboard

HUD → **Keyboard**. Keys send `keydown` / `keyup` to the PC via robotjs.

## Gamepad

If a gamepad is connected to the **phone** (or browser supports it), button/axis state is sent to the host and mapped to keys (v0.1 mapping is basic). Full ViGEm virtual Xbox pad is on the roadmap.

## Requirements for input

Host must have **robotjs** loaded:

```text
[input] robotjs loaded
```

If robotjs failed to load, reinstall it (see [Installation](02-installation.md)).
