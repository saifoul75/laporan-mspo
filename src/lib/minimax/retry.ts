import { RetryableError } from "./errors";

export interface RetryOptions {
  maxAttempts?: number;       // bilangan percubaan keseluruhan (termasuk yang pertama)
  baseDelayMs?: number;       // kelewatan asas
  maxDelayMs?: number;        // siling kelewatan
  jitter?: boolean;           // tambah rawak untuk elak thundering herd
  onRetry?: (attempt: number, err: unknown, delayMs: number) => void;
}

const DEFAULTS: Required<Omit<RetryOptions, "onRetry">> = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  jitter: true,
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal.aborted) {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
  signal?: AbortSignal,
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, jitter, onRetry } = {
    ...DEFAULTS,
    ...options,
  };

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof RetryableError;
      const isAbort = err instanceof DOMException && err.name === "AbortError";

      if (isAbort) throw err;
      if (!retryable || attempt === maxAttempts) throw err;

      // 2^attempt * base, capped, dengan jitter
      const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delay = jitter ? Math.floor(exp * (0.5 + Math.random() * 0.5)) : exp;

      onRetry?.(attempt, err, delay);
      await sleep(delay, signal);
    }
  }

  // Tidak pernah sampai sini, tapi untuk pengekangan jenis:
  throw lastErr instanceof Error ? lastErr : new Error("withRetry: habis cubaan");
}
