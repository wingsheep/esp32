---
name: "wled"
description: "Control the local ESP32/WLED light over serial. Use when the user asks to test, configure, or send WLED JSON, or when a workflow needs running/success/error/review/finish/off light feedback."
---

# WLED

Use this skill to control the local ESP32/WLED light over serial.

## Commands

Run commands from `/Users/sheep/Desktop/me/esp32`:

```bash
pnpm wled -- running
pnpm wled -- success
pnpm wled -- error
pnpm wled -- review
pnpm wled -- finish
pnpm wled:off
pnpm wled:ports
```

Direct CLI form:

```bash
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs --help
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs send --help
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs running
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs success
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs error
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs review
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs finish
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs off
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs ports
```

Flexible send examples:

```bash
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs send --json '{"on":true,"bri":128}'
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs send --color 255,0,0 --range 0:10
cat payload.json | node /Users/sheep/Desktop/me/esp32/dist/wled.mjs send --stdin
```

## State Map

- `running`: blue, task is in progress.
- `success`: green, task succeeded.
- `error`: red, task failed.
- `review`: yellow/orange, waiting for approval or review.
- `finish`: white, task finished.
- `off`: turn the light off.

## Configuration

Edit `/Users/sheep/Desktop/me/esp32/scripts/wled-profiles.json` to change:

- `port`: serial port path.
- `baudRate`: serial baud rate.
- `defaults.ledRange.start`: first LED index, starting from `0`.
- `defaults.ledRange.stop`: exclusive ending LED index. Use `null` to control all LEDs.
- `profiles.*.color`: RGB color values.

## Codex Hooks

Project hooks are configured in `/Users/sheep/Desktop/me/esp32/.codex/hooks.json`:

- `UserPromptSubmit`: runs `wled running`.
- `PermissionRequest`: runs `wled review`.
- `PostToolUse`: runs `.codex/hooks/post-tool-use.mjs`; only failed tool calls trigger `wled error`.
- `Stop`: runs `wled finish`.

## Notes

- The CLI source is TypeScript under `src/` and is built with `pnpm build`.
- The CLI sends direct WLED JSON over serial and does not depend on WLED presets.
- If the light does not react, run `pnpm wled:ports` and check `scripts/wled-profiles.json`.
- Serial access may require permission outside Codex sandbox in some contexts.
