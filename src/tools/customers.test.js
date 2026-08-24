import assert from 'node:assert/strict';
import test from 'node:test';

import { customerMatchesQuery, searchCustomers } from './customers.js';

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
