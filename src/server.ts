#!/usr/bin/env node
import { Command } from "commander";
import http from "node:http";
import { applyPayload, turnOff } from "./apply.js";
import { loadConfig } from "./config.js";
import type { WledPayload } from "./config.js";
import { buildProfilePayload, listPorts } from "./wled.js";

const program = new Command();

program
  .name("wled-server")
  .description("HTTP to serial gateway for WLED JSON payloads.")
  .option("--host <host>", "Host to listen on.", "127.0.0.1")
  .option("--port <port>", "Port to listen on.", value => Number(value), 8787);

interface RequestBody {
  payload?: WledPayload;
  offAfter?: number;
  owner?: string;
}

function sendJson(response: http.ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function readBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", chunk => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readJsonBody(request: http.IncomingMessage): Promise<RequestBody> {
  const body = await readBody(request);

  if (!body.trim()) {
    return {};
  }

  return JSON.parse(body) as RequestBody;
}

function getUrl(request: http.IncomingMessage): URL {
  return new URL(request.url ?? "/", "http://localhost");
}

function getOffAfter(url: URL, body: RequestBody): number | undefined {
  const value = body.offAfter ?? url.searchParams.get("offAfter");

  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("offAfter must be a non-negative integer.");
  }

  return parsed;
}

function getOwner(url: URL, body: RequestBody): string | undefined {
  return body.owner ?? url.searchParams.get("owner") ?? undefined;
}

async function handleRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
  const url = getUrl(request);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/ports") {
    sendJson(response, 200, { ports: await listPorts() });
    return;
  }

  if (request.method === "POST" && url.pathname === "/send") {
    const body = await readJsonBody(request);
    const payload = body.payload ?? (body as WledPayload);

    await applyPayload(payload, {
      offAfter: getOffAfter(url, body),
      owner: getOwner(url, body),
      trackOwner: payload.on !== false,
    });

    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname.startsWith("/profile/")) {
    const profileName = decodeURIComponent(url.pathname.slice("/profile/".length));
    const body = await readJsonBody(request);
    const config = loadConfig();
    const profile = config.profiles[profileName];

    if (!profile) {
      sendJson(response, 404, { ok: false, error: `Profile "${profileName}" is not configured.` });
      return;
    }

    await applyPayload(buildProfilePayload(config, profile), {
      offAfter: getOffAfter(url, body),
      owner: getOwner(url, body),
    });

    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/off") {
    const body = await readJsonBody(request);
    await turnOff(getOwner(url, body));
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, { ok: false, error: "Not found." });
}

program.action(options => {
  const server = http.createServer((request, response) => {
    handleRequest(request, response).catch(error => {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });

  server.listen(options.port, options.host, () => {
    console.log(`WLED serial gateway listening on http://${options.host}:${options.port}`);
  });
});

program.parseAsync(process.argv);
