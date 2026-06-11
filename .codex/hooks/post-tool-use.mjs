#!/usr/bin/env node
import { spawn } from "node:child_process";

const wledCli = "/Users/sheep/Desktop/me/esp32/dist/wled.mjs";

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

function runWledError() {
  const child = spawn(process.execPath, [wledCli, "error"], {
    stdio: "ignore",
    detached: false,
  });

  child.on("exit", code => {
    process.exit(code ?? 0);
  });

  child.on("error", () => {
    process.exit(0);
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
  runWledError();
} else {
  process.exit(0);
}
