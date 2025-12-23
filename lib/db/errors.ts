export class DatabaseError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
    this.cause = cause;
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(cause?: unknown) {
    super("Database connection failed", cause);
    this.name = "DatabaseConnectionError";
  }
}

export class DatabaseTimeoutError extends DatabaseError {
  constructor(timeout: number) {
    super(`Database operation timed out after ${timeout}ms`);
    this.name = "DatabaseTimeoutError";
  }
}

export const handleDatabaseError = (error: unknown): DatabaseError => {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes("connection")) {
      return new DatabaseConnectionError(error);
    }
    if (error.message.includes("timeout")) {
      return new DatabaseTimeoutError(5000);
    }
    return new DatabaseError(error.message, error);
  }

  return new DatabaseError("Unknown database error", error);
};

export const withDatabaseTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number = 5000,
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new DatabaseTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    throw handleDatabaseError(error);
  }
};
