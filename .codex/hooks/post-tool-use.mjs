#!/usr/bin/env node
import { spawn } from "node:child_process";

const wledCli = "/Users/sheep/Desktop/me/esp32/dist/wled.mjs";
const offDelayMs = 5000;

async function readStdin() {
  let input = "";

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  return input;
}

function getExitCode(event) {
  return (
    event.tool_response?.exit_code ??
    event.tool_response?.exitCode ??
    event.tool_result?.exit_code ??
    event.tool_result?.exitCode
  );
}

function runWled(args) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [wledCli, ...args], {
      stdio: "ignore",
      detached: false,
    });

    child.on("exit", () => resolve());
    child.on("error", () => resolve());
  });
}

const input = await readStdin();

if (!input.trim()) {
  process.exit(0);
}

let event;

try {
  event = JSON.parse(input);
} catch {
  process.exit(0);
}

const hookEventName = event.hook_event_name ?? event.event;

if (hookEventName !== "PostToolUse") {
  process.exit(0);
}

const exitCode = getExitCode(event);

if (typeof exitCode === "number" && exitCode !== 0) {
  await runWled(["error"]);
  await new Promise(resolve => setTimeout(resolve, offDelayMs));
  await runWled(["off"]);
} else {
  process.exit(0);
}
