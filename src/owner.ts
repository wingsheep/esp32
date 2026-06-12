import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export interface OwnerState {
  owner: string;
  updatedAt: number;
}

const stateDir = path.join(os.homedir(), ".wled");
const statePath = path.join(stateDir, "state.json");

function hash(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 10);
}

export function resolveOwner(owner?: string): string {
  if (owner) {
    return owner;
  }

  try {
    const gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (gitRoot) {
      return `${path.basename(gitRoot)}-${hash(gitRoot)}`;
    }
  } catch {
    // Fall back to cwd when not inside a git repository.
  }

  return `${path.basename(process.cwd())}-${hash(process.cwd())}`;
}

export function writeOwnerState(owner: string): void {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    statePath,
    JSON.stringify(
      {
        owner,
        updatedAt: Date.now(),
      } satisfies OwnerState,
      null,
      2
    )
  );
}

export function readOwnerState(): OwnerState | null {
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8")) as OwnerState;
  } catch {
    return null;
  }
}

export function isCurrentOwner(owner: string): boolean {
  return readOwnerState()?.owner === owner;
}
