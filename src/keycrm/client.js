import { KeyCrmError } from './errors.js';

const DEFAULT_TIMEOUT = 10_000;
const MAX_RETRIES = 3;

export function createClient() {
  const apiKey = process.env.KEYCRM_API_KEY;
  const baseUrl = (process.env.KEYCRM_API_URL || 'https://openapi.keycrm.app/v1').replace(/\/$/, '');

  if (!apiKey) {
    throw new KeyCrmError('KEYCRM_AUTH_ERROR', 'KEYCRM_API_KEY is not set');
  }

  async function request(method, path, body = null, retryCount = 0) {
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const options = {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
      };

      if (body !== null) options.body = JSON.stringify(body);

      const res = await fetch(url, options);

      if (res.status === 429) {
        if (retryCount < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          return request(method, path, body, retryCount + 1);
        }
        throw new KeyCrmError('KEYCRM_RATE_LIMIT', 'Rate limit exceeded after retries', 429);
      }

      if (res.status === 401 || res.status === 403) {
        throw new KeyCrmError('KEYCRM_AUTH_ERROR', 'Invalid or missing API key', res.status);
      }

      if (!res.ok) {
        let detail = null;
        try {
          const errBody = await res.json();
          detail = errBody.message || errBody.error || JSON.stringify(errBody);
        } catch {
          // ignore
        }
        throw new KeyCrmError('KEYCRM_API_ERROR', `API error ${res.status}`, res.status, detail);
      }

      if (res.status === 204) return null;
      return res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new KeyCrmError('KEYCRM_TIMEOUT', 'Request timed out');
      }
      if (err instanceof KeyCrmError) throw err;
      throw new KeyCrmError('INTERNAL_ERROR', err.message);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
  };
}
