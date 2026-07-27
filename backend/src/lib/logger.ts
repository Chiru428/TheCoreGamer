import pino from "pino";

// Next.js 15 native fetch (undici) occasionally leaks unhandled ECONNRESET
// errors to the console when keep-alive sockets drop while idle.
// We globally suppress these specific noisy errors from spamming the dev terminal.
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const err = args[0];
  if (err && err instanceof Error) {
    if (
      (err as NodeJS.ErrnoException).code === "ECONNRESET" ||
      err.message.includes("ECONNRESET") ||
      err.message.includes("Connection is closed")
    ) {
      return;
    }
  }
  originalConsoleError(...args);
};

// Also catch direct stderr writes from Node.js uncaught handlers
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = ((chunk: string | Uint8Array, encoding?: any, cb?: any) => {
  const str = typeof chunk === "string" ? chunk : chunk.toString();
  if (
    str.includes("ECONNRESET") ||
    str.includes("ignore-listed frames") ||
    str.includes("This error originated either by throwing inside of an async function") ||
    str.includes("node:internal/process/promises")
  ) {
    return true; // Pretend we wrote it
  }
  return originalStderrWrite(chunk, encoding, cb);
}) as typeof process.stderr.write;

function makeLogger() {
  const base: pino.LoggerOptions = { level: process.env.LOG_LEVEL || "info" };
  if (process.env.NODE_ENV !== "development") return pino(base);
  try {
    return pino({ ...base, transport: { target: "pino-pretty" } });
  } catch {
    return pino(base);
  }
}

export const logger = makeLogger();
