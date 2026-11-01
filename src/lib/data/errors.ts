export class DataError extends Error {
  readonly operation: string;

  constructor(operation: string, message: string) {
    super(`${operation}: ${message}`);
    this.name = "DataError";
    this.operation = operation;
  }
}

type Result<T> = {
  data: T;
  error: { message: string; code?: string } | null;
};

export function assertOk(
  result: { error: { message: string } | null },
  operation: string,
) {
  if (result.error) throw new DataError(operation, result.error.message);
}

export function unwrap<T>(
  result: Result<T>,
  operation: string,
): NonNullable<T> {
  assertOk(result, operation);
  if (result.data == null) throw new DataError(operation, "empty response");
  return result.data as NonNullable<T>;
}

export function unwrapMaybe<T>(
  result: Result<T | null>,
  operation: string,
): T | null {
  assertOk(result, operation);
  return result.data;
}
