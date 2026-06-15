#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs";
import { loadConfig } from "./config.js";
import { applyPayload, turnOff } from "./apply.js";
import { buildProfilePayload, buildSegmentPayload, listPorts, sendWledPayload } from "./wled.js";

const program = new Command();
const profileNames = ["running", "success", "error", "review", "finish"] as const;

program
  .name("wled")
  .description("Send WLED JSON over serial, with local profile shortcuts.")
  .version("1.0.0")
  .addHelpText(
    "after",
    `
Examples:
  $ wled send --json '{"on":true,"bri":128}'
  $ wled send --color 255,0,0 --range 0:10
  $ echo '{"on":false}' | wled send --stdin
  $ wled profile running
`
  );

function parseInteger(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Expected integer, got "${value}".`);
  }

  return parsed;
}

function parseRgb(value: string): [number, number, number] {
  const parts = value.split(",").map(part => parseInteger(part.trim()));

  if (parts.length !== 3 || parts.some(part => part < 0 || part > 255)) {
    throw new Error(`Expected RGB value like "255,0,0", got "${value}".`);
  }

  return parts as [number, number, number];
}

function parseByte(value: string): number {
  const parsed = parseInteger(value);

  if (parsed < 0 || parsed > 255) {
    throw new Error(`Expected value between 0 and 255, got "${value}".`);
  }

  return parsed;
}

function parseNonNegativeInteger(value: string): number {
  const parsed = parseInteger(value);

  if (parsed < 0) {
    throw new Error(`Expected non-negative integer, got "${value}".`);
  }

  return parsed;
}

function parseRange(value: string): { start?: number; stop?: number } {
  const [startValue, stopValue] = value.split(":");
  const start = startValue ? parseInteger(startValue) : undefined;
  const stop = stopValue ? parseInteger(stopValue) : undefined;

  return { start, stop };
}

function parseJsonPayload(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Invalid JSON payload.");
  }
}

async function readStdin(): Promise<string> {
  let input = "";

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  return input;
}

for (const profileName of profileNames) {
  program
    .command(profileName)
    .description(`Apply profile "${profileName}".`)
    .option("--off-after <ms>", "Turn light off after the given delay in milliseconds.", parseNonNegativeInteger)
    .option("--owner <id>", "Owner id used to protect delayed off from other sessions.")
    .action(async options => {
      const config = loadConfig();
      const profile = config.profiles[profileName];

      if (!profile) {
        throw new Error(`Profile "${profileName}" is not configured.`);
      }

      await applyPayload(buildProfilePayload(config, profile), {
        offAfter: options.offAfter,
        owner: options.owner,
      });
    });
}

program
  .command("profile")
  .description("Apply one configured local profile.")
  .argument("<name>", `Profile name: ${profileNames.join(", ")}.`)
  .option("--off-after <ms>", "Turn light off after the given delay in milliseconds.", parseNonNegativeInteger)
  .option("--owner <id>", "Owner id used to protect delayed off from other sessions.")
  .action(async (name, options) => {
    const config = loadConfig();
    const profile = config.profiles[name];

    if (!profile) {
      throw new Error(`Profile "${name}" is not configured.`);
    }

    await applyPayload(buildProfilePayload(config, profile), {
      offAfter: options.offAfter,
      owner: options.owner,
    });
  });

program
  .command("send")
  .description("Send a custom WLED JSON payload over serial.")
  .option("-j, --json <json>", "Raw WLED JSON payload.")
  .option("-f, --file <path>", "Read WLED JSON payload from a file.")
  .option("--stdin", "Read WLED JSON payload from stdin.")
  .option("--color <rgb>", "Set segment color, for example 255,0,0.")
  .option("--range <start:stop>", "Set segment range. Stop is exclusive, for example 0:10.")
  .option("-b, --brightness <value>", "Set brightness 0-255.", parseByte)
  .option("--on", "Turn light on.")
  .option("--off", "Turn light off.")
  .option("--off-after <ms>", "Turn light off after the given delay in milliseconds.", parseNonNegativeInteger)
  .option("--owner <id>", "Owner id used to protect delayed off from other sessions.")
  .addHelpText(
    "after",
    `
Examples:
  $ wled send --json '{"on":true,"seg":[{"col":[[0,255,0]]}]}'
  $ wled send --color 0,0,255 --brightness 160 --range 0:20
  $ wled send --file payload.json
  $ cat payload.json | wled send --stdin
`
  )
  .action(async options => {
    const rawSources = [options.json, options.file, options.stdin].filter(Boolean).length;

    if (rawSources > 1) {
      throw new Error("Use only one of --json, --file, or --stdin.");
    }

    let payload;

    if (options.json) {
      payload = parseJsonPayload(options.json);
    } else if (options.file) {
      payload = parseJsonPayload(fs.readFileSync(options.file, "utf8"));
    } else if (options.stdin) {
      payload = parseJsonPayload(await readStdin());
    } else {
      const range = options.range ? parseRange(options.range) : {};
      payload = buildSegmentPayload({
        color: options.color ? parseRgb(options.color) : undefined,
        brightness: options.brightness,
        on: options.off ? false : options.on ? true : undefined,
        ...range,
      });
    }

    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("No payload specified. Use --help for examples.");
    }

    await applyPayload(payload, {
      offAfter: options.offAfter,
      owner: options.owner,
      trackOwner: !options.off,
    });
  });

program
  .command("off")
  .description("Turn the WLED light off.")
  .option("--owner <id>", "Only turn off when the current owner matches this owner id.")
  .action(async options => {
    await turnOff(options.owner);
  });

program
  .command("ports")
  .description("List available serial ports.")
  .action(async () => {
    const ports = await listPorts();

    console.table(
      ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer || "-",
        vendorId: port.vendorId || "-",
        productId: port.productId || "-",
      }))
    );
  });

program.parseAsync(process.argv).catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
