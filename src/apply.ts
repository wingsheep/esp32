import { loadConfig, type WledPayload } from "./config.js";
import { isCurrentOwner, resolveOwner, writeOwnerState } from "./owner.js";
import { sendWledPayload } from "./wled.js";

export interface ApplyOptions {
  offAfter?: number;
  owner?: string;
  trackOwner?: boolean;
}

export async function applyPayload(payload: WledPayload, options: ApplyOptions = {}): Promise<void> {
  const config = loadConfig();
  const owner = resolveOwner(options.owner);

  await sendWledPayload(config, payload);

  if (options.trackOwner !== false) {
    writeOwnerState(owner);
  }

  if (typeof options.offAfter === "number" && options.offAfter > 0) {
    await new Promise(resolve => setTimeout(resolve, options.offAfter));

    if (isCurrentOwner(owner)) {
      await sendWledPayload(config, { on: false });
    }
  }
}

export async function turnOff(owner?: string): Promise<void> {
  const resolvedOwner = owner ? resolveOwner(owner) : undefined;

  if (resolvedOwner && !isCurrentOwner(resolvedOwner)) {
    return;
  }

  await sendWledPayload(loadConfig(), { on: false });
}
