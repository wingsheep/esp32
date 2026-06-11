import { SerialPort } from "serialport";
import type { WledConfig, WledProfile } from "./config.js";

export interface WledPayload {
  on?: boolean;
  bri?: number;
  seg?: Array<{
    start?: number;
    stop?: number;
    col: Array<[number, number, number]>;
  }>;
}

export interface SegmentOptions {
  color?: [number, number, number];
  start?: number;
  stop?: number;
  brightness?: number;
  on?: boolean;
}

export function buildProfilePayload(config: WledConfig, profile: WledProfile): WledPayload {
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

export async function sendWledPayload(config: WledConfig, payload: WledPayload): Promise<void> {
  const port = new SerialPort({
    path: config.port,
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
