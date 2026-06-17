import { SerialPort } from "serialport";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { configPath, type WledConfig, type WledPayload, type WledProfile } from "./config.js";

interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
}

export interface SegmentOptions {
  color?: [number, number, number];
  start?: number;
  stop?: number;
  brightness?: number;
  on?: boolean;
}

export function buildProfilePayload(config: WledConfig, profile: WledProfile): WledPayload {
  if (profile.payload) {
    return profile.payload;
  }

  if (!profile.color) {
    throw new Error("Profile must define either payload or color.");
  }

  const ledRange = config.defaults?.ledRange ?? {};
  const start =
    typeof ledRange.start === "number" && Number.isInteger(ledRange.start)
      ? ledRange.start
      : undefined;
  const stop =
    typeof ledRange.stop === "number" && Number.isInteger(ledRange.stop)
      ? ledRange.stop
      : undefined;

  return {
    on: true,
    seg: [
      {
        ...(start === undefined ? {} : { start }),
        ...(stop === undefined ? {} : { stop }),
        col: [profile.color],
      },
    ],
  };
}

export function buildSegmentPayload(options: SegmentOptions): WledPayload {
  const payload: WledPayload = {};

  if (typeof options.on === "boolean") {
    payload.on = options.on;
  }

  if (typeof options.brightness === "number") {
    payload.bri = options.brightness;
  }

  if (options.color) {
    payload.on ??= true;
    payload.seg = [
      {
        ...(options.start === undefined ? {} : { start: options.start }),
        ...(options.stop === undefined ? {} : { stop: options.stop }),
        col: [options.color],
      },
    ];
  }

  return payload;
}

function isUsbSerialPort(port: SerialPortInfo): boolean {
  const text = [port.path, port.manufacturer, port.vendorId, port.productId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("usb") ||
    text.includes("wch") ||
    text.includes("ch340") ||
    text.includes("cp210") ||
    text.includes("silicon labs")
  );
}

async function resolveSerialPath(configuredPath: string): Promise<string> {
  if (fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  const ports = await listPorts();
  const usbPorts = ports.filter(port => isUsbSerialPort(port));

  if (usbPorts.length === 1) {
    return usbPorts[0].path;
  }

  const availablePorts = ports.map(port => port.path).join(", ") || "none";
  const reason =
    usbPorts.length === 0
      ? "No USB serial port was detected."
      : `Multiple USB serial ports were detected: ${usbPorts.map(port => port.path).join(", ")}.`;

  throw new Error(
    [
      `Serial port "${configuredPath}" does not exist.`,
      reason,
      `Available serial ports: ${availablePorts}.`,
      `Update "port" in ${fileURLToPath(configPath)} or reconnect the ESP32.`,
    ].join("\n")
  );
}

export async function sendWledPayload(config: WledConfig, payload: WledPayload): Promise<void> {
  const serialPath = await resolveSerialPath(config.port);

  const port = new SerialPort({
    path: serialPath,
    baudRate: config.baudRate,
    autoOpen: false,
  });

  await new Promise<void>((resolve, reject) => {
    port.open(err => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

  await new Promise(resolve => setTimeout(resolve, 1200));

  await new Promise<void>((resolve, reject) => {
    port.write(`${JSON.stringify(payload)}\n`, err => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

  await new Promise<void>((resolve, reject) => {
    port.drain(err => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

  await new Promise<void>(resolve => {
    port.close(() => resolve());
  });
}

export async function listPorts() {
  return SerialPort.list();
}
