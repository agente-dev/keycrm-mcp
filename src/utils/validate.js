import { KeyCrmError } from '../keycrm/errors.js';

export function requireAtLeastOne(obj, fields) {
  const provided = fields.filter((f) => obj[f] !== undefined && obj[f] !== null);
  if (provided.length === 0) {
    throw new KeyCrmError(
      'VALIDATION_ERROR',
      `At least one of the following fields must be provided: ${fields.join(', ')}`
    );
  }
}

export function requireConfirm(params, toolName) {
  if (!params.confirm) {
    throw new KeyCrmError(
      'VALIDATION_ERROR',
      `${toolName} requires confirm: true to execute`
    );
  }
}

export function buildQuery(params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      qs.set(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}
