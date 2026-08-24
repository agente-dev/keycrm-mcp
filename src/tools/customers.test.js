import assert from 'node:assert/strict';
import test from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { KeyCrmError, normalizeError } from '../keycrm/errors.js';
import { customerMatchesQuery, registerCustomerTools, searchCustomers } from './customers.js';

function createTestWrap() {
  return (_toolName, fn) => async (params) => {
    try {
      const result = await fn(params);
      return {
        content: [{ type: 'text', text: JSON.stringify(result ?? null) }],
      };
    } catch (err) {
      const normalized = normalizeError(err);
      return {
        isError: true,
        content: [{ type: 'text', text: JSON.stringify(normalized.toJSON()) }],
      };
    }
  };
}

async function createCustomerToolHarness(client) {
  const server = new McpServer({ name: 'customer-test-server', version: '1.0.0' });
  registerCustomerTools(server, client, createTestWrap());
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const mcpClient = new Client({ name: 'customer-test-client', version: '1.0.0' });
  await server.connect(serverTransport);
  await mcpClient.connect(clientTransport);

  return {
    call: (arguments_) => mcpClient.callTool({ name: 'list_customers', arguments: arguments_ }),
    async close() {
      await mcpClient.close();
      await server.close();
    },
  };
}

function resultJson(result) {
  return JSON.parse(result.content[0].text);
}

test('customer search matches names, emails, and formatted phone numbers', () => {
  const customer = {
    full_name: 'Polish Example Sp z o.o.',
    email: 'contact@example.test',
    phone: '+48 123-456-789',
  };

  assert.equal(customerMatchesQuery(customer, 'polish example'), true);
  assert.equal(customerMatchesQuery(customer, 'CONTACT@EXAMPLE.TEST'), true);
  assert.equal(customerMatchesQuery(customer, '48123456789'), true);
  assert.equal(customerMatchesQuery(customer, 'unrelated'), false);
});

test('customer search scans supported pages without sending filter[query]', async () => {
  const calls = [];
  const responses = [
    {
      data: [{ id: 1, full_name: 'Other Customer' }],
      current_page: 1,
      last_page: 2,
    },
    {
      data: [{ id: 2, full_name: 'Polish Example Sp z o.o.' }],
      current_page: 2,
      last_page: 2,
    },
  ];
  const client = {
    async get(path) {
      calls.push(path);
      return responses.shift();
    },
  };

  const result = await searchCustomers(client, 'polish', 10, 0);

  assert.deepEqual(calls, ['/buyer?limit=50&page=1', '/buyer?limit=50&page=2']);
  assert.equal(calls.some((path) => path.includes('filter')), false);
  assert.deepEqual(result.data, [{ id: 2, full_name: 'Polish Example Sp z o.o.' }]);
  assert.equal(result.total, 1);
  assert.equal(result.search_truncated, false);
});

test('customer search recomputes filtered pagination metadata for offsets', async () => {
  const client = {
    async get() {
      return {
        data: [
          { id: 1, full_name: 'Polish Example One' },
          { id: 2, full_name: 'Polish Example Two' },
        ],
        current_page: 1,
        last_page: 1,
        per_page: 50,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 50,
          total: 50,
        },
      };
    },
  };

  const result = await searchCustomers(client, 'polish', 1, 1);

  assert.deepEqual(result.data, [{ id: 2, full_name: 'Polish Example Two' }]);
  assert.equal(result.total, 2);
  assert.equal(result.current_page, 2);
  assert.equal(result.last_page, 2);
  assert.equal(result.per_page, 1);
  assert.deepEqual(result.meta, {
    current_page: 2,
    last_page: 2,
    per_page: 1,
    total: 2,
  });
});

test('list_customers validates the public schema before calling the API', async () => {
  const calls = [];
  const harness = await createCustomerToolHarness({
    async get(path) {
      calls.push(path);
      return { data: [] };
    },
  });

  try {
    const result = await harness.call({ limit: 0 });

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Input validation error/);
    assert.deepEqual(calls, []);
  } finally {
    await harness.close();
  }
});

test('list_customers applies non-aligned offsets across at most two native pages', async () => {
  const calls = [];
  const harness = await createCustomerToolHarness({
    async get(path) {
      calls.push(path);
      const page = Number(new URL(`https://example.test${path}`).searchParams.get('page'));
      return {
        data: Array.from({ length: 3 }, (_, index) => ({ id: (page - 1) * 3 + index + 1 })),
        current_page: page,
        last_page: 4,
        total: 12,
        links: { next: `/buyer?limit=3&page=${page + 1}` },
      };
    },
  });

  try {
    const result = await harness.call({ limit: 3, offset: 1 });
    const payload = resultJson(result);

    assert.deepEqual(calls, ['/buyer?limit=3&page=1', '/buyer?limit=3&page=2']);
    assert.deepEqual(payload.data, [{ id: 2 }, { id: 3 }, { id: 4 }]);
    assert.equal(payload.total, 12);
    assert.equal(payload.links, undefined);
  } finally {
    await harness.close();
  }
});

test('list_customers bounds a search with missing terminal metadata', async () => {
  const calls = [];
  const harness = await createCustomerToolHarness({
    async get(path) {
      calls.push(path);
      const page = Number(new URL(`https://example.test${path}`).searchParams.get('page'));
      return {
        data: Array.from({ length: 50 }, (_, index) => ({
          id: (page - 1) * 50 + index + 1,
          full_name: 'No match',
        })),
        current_page: page,
      };
    },
  });

  try {
    const result = await harness.call({ query: 'target', limit: 5 });
    const payload = resultJson(result);

    assert.equal(result.isError, undefined);
    assert.equal(calls.length, 20);
    assert.deepEqual(calls, Array.from({ length: 20 }, (_, index) => `/buyer?limit=50&page=${index + 1}`));
    assert.equal(payload.search_truncated, true);
    assert.deepEqual(payload.data, []);
  } finally {
    await harness.close();
  }
});

test('list_customers wraps downstream API errors as structured MCP errors', async () => {
  const harness = await createCustomerToolHarness({
    async get() {
      throw new KeyCrmError('KEYCRM_API_ERROR', 'Customer API unavailable', 503, 'maintenance');
    },
  });

  try {
    const result = await harness.call({});
    const payload = resultJson(result);

    assert.equal(result.isError, true);
    assert.deepEqual(payload, {
      error: true,
      code: 'KEYCRM_API_ERROR',
      status: 503,
      message: 'Customer API unavailable',
      detail: 'maintenance',
    });
  } finally {
    await harness.close();
  }
});

test('filtered customer results remove stale pagination URL metadata', async () => {
  const client = {
    async get() {
      return {
        data: [
          { id: 1, full_name: 'Target One' },
          { id: 2, full_name: 'Target Two' },
        ],
        current_page: 1,
        last_page: 1,
        per_page: 50,
        total: 50,
        first_page_url: '/buyer?page=1',
        last_page_url: '/buyer?page=1',
        next_page_url: '/buyer?page=2',
        prev_page_url: null,
        links: [{ url: '/buyer?page=1', label: '1', active: true }],
        meta: {
          first_page_url: '/buyer?page=1',
          next_page_url: '/buyer?page=2',
          links: [{ url: '/buyer?page=1', label: '1', active: true }],
          total: 50,
        },
      };
    },
  };

  const result = await searchCustomers(client, 'target', 1, 0);

  assert.deepEqual(result.data, [{ id: 1, full_name: 'Target One' }]);
  assert.equal(result.total, 2);
  assert.equal(result.first_page_url, undefined);
  assert.equal(result.last_page_url, undefined);
  assert.equal(result.next_page_url, undefined);
  assert.equal(result.prev_page_url, undefined);
  assert.equal(result.links, undefined);
  assert.equal(result.meta.first_page_url, undefined);
  assert.equal(result.meta.next_page_url, undefined);
  assert.equal(result.meta.links, undefined);
});
