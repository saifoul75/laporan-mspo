// Ralat yang menandakan kegagalan sementara dan patut dicuba semula.
export class RetryableError extends Error {
  public readonly isRetryable = true as const;

  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "RetryableError";
  }
}

// Ralat bukan sementara (4xx selain kod transient, parsing, dll.)
export class MiniMaxError extends Error {
  public readonly isRetryable = false as const;
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number, public readonly cause?: unknown) {
    super(message);
    this.name = "MiniMaxError";
    this.statusCode = statusCode;
  }
}
