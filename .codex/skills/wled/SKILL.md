---
name: "wled"
description: "Control the local ESP32/WLED light over serial. Use when the user asks to test, configure, or send WLED JSON, or when a workflow needs running/success/error/review/finish/off light feedback."
---

# WLED

Use this skill to control the local ESP32/WLED light over serial.

## Commands

Run commands from `/Users/sheep/Desktop/me/esp32`:

```bash
pnpm wled
pnpm wled:running
pnpm wled:success
pnpm wled:error
pnpm wled:review
pnpm wled:finish
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
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs running --off-after 3000
node /Users/sheep/Desktop/me/esp32/dist/wled.mjs running --owner esp32 --off-after 3000
cat payload.json | node /Users/sheep/Desktop/me/esp32/dist/wled.mjs send --stdin
```

## State Map

- `running`: blue breathing effect, task is in progress.
- `success`: green breathing effect, task succeeded.
- `error`: faster red breathing effect, task failed.
- `review`: yellow/orange breathing effect, waiting for approval or review.
- `finish`: slow white breathing effect, task finished.
- `off`: turn the light off.

## Configuration

Edit `/Users/sheep/Desktop/me/esp32/scripts/wled-profiles.json` to change:

- `port`: serial port path.
- `baudRate`: serial baud rate.
- `defaults.ledRange.start`: first LED index, starting from `0`.
- `defaults.ledRange.stop`: exclusive ending LED index. Use `null` to control all LEDs.
- `profiles.*.color`: shorthand RGB color values.
- `profiles.*.payload`: full WLED JSON payload. This takes precedence over `color`.
- `--owner <id>` protects delayed off from other sessions. If omitted, owner is derived from the git root.

## Codex Hooks

Project hooks are configured in `/Users/sheep/Desktop/me/esp32/.codex/hooks.json`:

- `UserPromptSubmit`: runs `wled running`.
- `PermissionRequest`: runs `wled review`.
- `PostToolUse`: runs `.codex/hooks/post-tool-use.mjs`; only failed tool calls trigger `wled error --owner esp32 --off-after 5000`.
- `Stop`: runs `wled finish --owner esp32 --off-after 3000`.

## Notes

- The CLI source is TypeScript under `src/` and is built with `pnpm build`.
- The CLI sends direct WLED JSON over serial and does not depend on WLED presets.
- If the light does not react, run `pnpm wled:ports` and check `scripts/wled-profiles.json`.
- Serial access may require permission outside Codex sandbox in some contexts.
