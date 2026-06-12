#!/usr/bin/env node
import { spawn } from "node:child_process";

const wledCli = "/Users/sheep/Desktop/me/esp32/dist/wled.mjs";
const profile = process.argv[2];
const offDelayMs = Number(process.argv[3] ?? 3000);

if (!profile) {
  process.exit(0);
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

await runWled([profile]);

if (Number.isFinite(offDelayMs) && offDelayMs > 0) {
  await new Promise(resolve => setTimeout(resolve, offDelayMs));
  await runWled(["off"]);
}
