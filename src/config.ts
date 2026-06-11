import fs from "node:fs";

export type RgbColor = [number, number, number];

export interface WledPayload {
  on?: boolean;
  bri?: number;
  seg?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface WledProfile {
  color?: RgbColor;
  payload?: WledPayload;
}

export interface WledConfig {
  port: string;
  baudRate: number;
  defaults?: {
    ledRange?: {
      start?: number;
      stop?: number | null;
    };
  };
  profiles: Record<string, WledProfile>;
}

export const configPath = new URL("../scripts/wled-profiles.json", import.meta.url);

export function loadConfig(): WledConfig {
  return JSON.parse(fs.readFileSync(configPath, "utf8")) as WledConfig;
}
