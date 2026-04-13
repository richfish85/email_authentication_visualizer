export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class DnsLookupError extends Error {
  constructor(
    public readonly recordName: string,
    cause?: unknown,
  ) {
    super(`DNS lookup failed for ${recordName}.`, {
      cause,
    });
    this.name = "DnsLookupError";
  }
}
