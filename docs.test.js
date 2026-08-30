import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('README records the current official keyCRM API rate limit', async () => {
  const readme = await readFile(new URL('./README.md', import.meta.url), 'utf8');

  assert.match(readme, /up to 20 requests per minute per API key/);
  assert.match(
    readme,
    /https:\/\/help\.keycrm\.app\/uk\/process-automation-api-and-more\/where-to-get-an-api-key/,
  );
  assert.doesNotMatch(readme, /60 requests per minute per IP address per API key/);
});
