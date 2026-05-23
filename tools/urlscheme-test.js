#!/usr/bin/env node

const crypto = require("crypto");
const http = require("http");
const { spawn } = require("child_process");

const DEFAULT_PORT = 8765;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_ACTION = "ping";

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  validateOptions(options);

  const callbackBaseUrl = `http://127.0.0.1:${options.port}/callback`;
  const successUrl = `${callbackBaseUrl}/success`;
  const errorUrl = `${callbackBaseUrl}/error`;
  const marginNoteUrl = buildMarginNoteUrl(options, successUrl, errorUrl);

  const server = http.createServer((request, response) => {
    handleCallbackRequest(request, response, server, options, marginNoteUrl);
  });

  const timeout = setTimeout(() => {
    console.error("");
    console.error("[URLScheme Test] timeout");
    console.error(`  waitedMs: ${options.timeoutMs}`);
    console.error(`  url: ${maskSensitive(marginNoteUrl)}`);
    console.error("  hint: confirm MarginNote is running, the plugin is deployed, and secret is correct.");
    server.close();
    process.exitCode = 1;
  }, options.timeoutMs);

  server.on("close", () => clearTimeout(timeout));

  server.listen(options.port, "127.0.0.1", () => {
    console.log("[URLScheme Test] callback server listening");
    console.log(`  success: ${successUrl}`);
    console.log(`  error: ${errorUrl}`);
    console.log("[URLScheme Test] generated MarginNote URL");
    console.log(`  ${maskSensitive(marginNoteUrl)}`);

    if (options.openUrl) {
      openUrl(marginNoteUrl);
    } else {
      console.log("[URLScheme Test] --no-open enabled; open this URL manually.");
    }
  });
}

function parseArgs(args) {
  const options = {
    action: DEFAULT_ACTION,
    secret: "",
    requestId: "",
    payload: null,
    port: DEFAULT_PORT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    openUrl: true,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--no-open") {
      options.openUrl = false;
      continue;
    }

    if (arg === "--secret") {
      options.secret = readOptionValue(args, ++i, arg);
      continue;
    }

    if (arg === "--request-id") {
      options.requestId = readOptionValue(args, ++i, arg);
      continue;
    }

    if (arg === "--action") {
      options.action = readOptionValue(args, ++i, arg);
      continue;
    }

    if (arg === "--payload") {
      options.payload = readOptionValue(args, ++i, arg);
      continue;
    }

    if (arg === "--port") {
      options.port = Number(readOptionValue(args, ++i, arg));
      continue;
    }

    if (arg === "--timeout") {
      options.timeoutMs = Number(readOptionValue(args, ++i, arg));
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function readOptionValue(args, index, optionName) {
  if (index >= args.length || args[index].startsWith("--")) {
    throw new Error(`Missing value for ${optionName}`);
  }

  return args[index];
}

function validateOptions(options) {
  if (!options.secret) {
    throw new Error("Missing required option: --secret");
  }

  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error("Invalid --port. Expected an integer from 1 to 65535.");
  }

  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("Invalid --timeout. Expected a positive integer in milliseconds.");
  }

  if (options.payload !== null) {
    parsePayload(options.payload);
  }
}

function buildMarginNoteUrl(options, successUrl, errorUrl) {
  const requestId = options.requestId || `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const params = [
    ["requestId", requestId],
    ["action", options.action],
    ["secret", options.secret],
    ["x-success", successUrl],
    ["x-error", errorUrl],
  ];

  const payload = resolvePayload(options);
  if (payload !== null) {
    params.push(["payload", JSON.stringify(payload)]);
  }

  return "marginnote4app://addon/api?" + params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function resolvePayload(options) {
  if (options.payload !== null) {
    return parsePayload(options.payload);
  }

  return null;
}

function parsePayload(payloadText) {
  try {
    return JSON.parse(payloadText);
  } catch (error) {
    throw new Error(`Invalid --payload JSON: ${error.message}`);
  }
}

function handleCallbackRequest(request, response, server, options, marginNoteUrl) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${options.port}`);
  const callbackType = requestUrl.pathname.replace("/callback/", "");
  const payloadText = requestUrl.searchParams.get("payload") || "";
  const payload = parseCallbackPayload(payloadText);

  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end("ok\n");

  console.log("");
  console.log("[URLScheme Test] callback received");
  console.log(`  path: ${requestUrl.pathname}`);
  console.log(`  type: ${callbackType || "unknown"}`);
  console.log("[URLScheme Test] payload");
  console.log(JSON.stringify(payload, null, 2));

  if (payload && payload.code === "OK" && callbackType === "success") {
    console.log("[URLScheme Test] result: success");
    process.exitCode = 0;
  } else {
    console.log("[URLScheme Test] result: gateway returned error or non-success callback");
    console.log(`  originalUrl: ${maskSensitive(marginNoteUrl)}`);
    process.exitCode = 1;
  }

  server.close();
}

function parseCallbackPayload(payloadText) {
  if (!payloadText) {
    return null;
  }

  try {
    return JSON.parse(payloadText);
  } catch (error) {
    return {
      code: "INVALID_CALLBACK_PAYLOAD",
      message: error.message,
      raw: payloadText,
    };
  }
}

function openUrl(url) {
  const child = spawn("open", [url], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  console.log("[URLScheme Test] opened URL with macOS open");
}

function maskSensitive(url) {
  return String(url)
    .replace(/([?&]secret=)([^&#]*)/g, "$1[REDACTED]");
}

function printHelp() {
  console.log(`Usage:
  pnpm test:urlscheme -- --secret mnsec_xxx [options]

Options:
  --action NAME           Action to call. Default: ping
  --payload JSON          JSON payload for read/ls/find/tree/write/delete
  --request-id TEXT       Request id. Default: generated unique id
  --port NUMBER           Local callback port. Default: ${DEFAULT_PORT}
  --timeout NUMBER        Timeout in milliseconds. Default: ${DEFAULT_TIMEOUT_MS}
  --no-open               Print URL but do not open it
  --help                  Show this help

Examples:
  pnpm test:urlscheme -- --secret mnsec_xxx --action ping
  pnpm test:urlscheme -- --secret mnsec_xxx --action ls --payload '{"path":"notebook://"}'
`);
}

try {
  main();
} catch (error) {
  console.error("[URLScheme Test] failed");
  console.error(`  ${error.message}`);
  process.exitCode = 1;
}
