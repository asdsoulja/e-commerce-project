import { NextFunction, Request, Response } from "express";

const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 300;
const MAX_ARRAY_LENGTH = 20;
const MAX_OBJECT_KEYS = 40;
const MAX_DEPTH = 6;

const SENSITIVE_KEYS = new Set([
  "password",
  "newPassword",
  "confirmPassword",
  "token",
  "refreshToken",
  "accessToken",
  "authorization",
  "cookie",
  "session",
  "sessionid",
  "creditCard",
  "cardNumber",
  "cvv"
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_STRING_LENGTH)}... [truncated ${value.length - MAX_STRING_LENGTH} chars]`;
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) {
    return "[MaxDepth]";
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.byteLength} bytes]`;
  }

  if (Array.isArray(value)) {
    const sliced = value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitize(item, depth + 1));
    if (value.length > MAX_ARRAY_LENGTH) {
      sliced.push(`[+${value.length - MAX_ARRAY_LENGTH} more items]`);
    }
    return sliced;
  }

  if (isPlainObject(value)) {
    const output: Record<string, unknown> = {};
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);

    for (const [key, nestedValue] of entries) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        output[key] = REDACTED;
      } else {
        output[key] = sanitize(nestedValue, depth + 1);
      }
    }

    const totalKeys = Object.keys(value).length;
    if (totalKeys > MAX_OBJECT_KEYS) {
      output.__truncatedKeys = totalKeys - MAX_OBJECT_KEYS;
    }

    return output;
  }

  return String(value);
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  const requestId = Math.random().toString(36).slice(2, 8);

  const incoming = {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    user: req.session?.user ? { id: req.session.user.id, role: req.session.user.role } : null,
    params: sanitize(req.params),
    query: sanitize(req.query),
    body: sanitize(req.body),
    headers: sanitize({
      "user-agent": req.get("user-agent"),
      origin: req.get("origin"),
      referer: req.get("referer")
    })
  };

  console.log(`[api][${requestId}] --> ${req.method} ${req.originalUrl}`);
  console.log(`[api][${requestId}] req ${JSON.stringify(incoming)}`);

  let responseBody: unknown;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as typeof res.json;

  res.send = ((body: unknown) => {
    if (responseBody === undefined) {
      responseBody = body;
    }
    return originalSend(body);
  }) as typeof res.send;

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const outgoing = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      contentLength: res.getHeader("content-length") ?? null,
      body: sanitize(responseBody)
    };

    console.log(`[api][${requestId}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
    console.log(`[api][${requestId}] res ${JSON.stringify(outgoing)}`);
  });

  next();
}
