export class KeyCrmError extends Error {
  constructor(code, message, status = null, detail = null) {
    super(message);
    this.name = 'KeyCrmError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      status: this.status,
      message: this.message,
      detail: this.detail,
    };
  }
}

export function normalizeError(err) {
  if (err instanceof KeyCrmError) return err;
  return new KeyCrmError('INTERNAL_ERROR', err.message || 'Unexpected error');
}
